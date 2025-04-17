import { BlockArgumentNode, BlockNode, BlockParameterNode, BlockParametersNode, CallNode, FalseNode, IntegerNode, KeywordHashNode, KeywordRestParameterNode, LocalVariableReadNode, LocalVariableWriteNode, Location, NilNode, Node, OptionalKeywordParameterNode, OptionalParameterNode, ParenthesesNode, ProgramNode, RequiredKeywordParameterNode, RequiredParameterNode, RestParameterNode, SelfNode, SourceEncodingNode, SourceFileNode, SourceLineNode, SplatNode, StatementsNode, TrueNode } from "@ruby/prism";

export class StringifyError extends Error {
  static {
    this.prototype.name = "StringifyError";
  }
}

export function stringifyProgram(program: ProgramNode): string {
  const printer = new Printer();
  printer.printProgram(program);
  return printer.buf;
}

const INDENT_UNIT = "  ";
// const LEVEL_PRIMARY = 1;
const LEVEL_CALL = 2;
const LEVEL_UNARY = 3;
const LEVEL_EXPONENTIAL = 4;
const LEVEL_UNARY_MINUS = 5;
const LEVEL_MULTIPLICATIVE = 6;
const LEVEL_ADDITIVE = 7;
const LEVEL_SHIFT = 8;
const LEVEL_BITWISE_AND = 9;
const LEVEL_BITWISE_OR = 10;
const LEVEL_INEQUALITY = 11;
const LEVEL_EQUALITY = 12;
// const LEVEL_LOGICAL_AND = 13;
// const LEVEL_LOGICAL_OR = 14;
const LEVEL_ASGN = 15;
const LEVEL_STMT = 16;
const UNARY_LEVELS: Record<string, number> = {
  "+@": LEVEL_UNARY,
  "-@": LEVEL_UNARY_MINUS,
  "!": LEVEL_UNARY,
  "~": LEVEL_UNARY,
};
const BINARY_LEVELS: Record<string, number> = {
  "**": LEVEL_EXPONENTIAL,
  "*": LEVEL_MULTIPLICATIVE,
  "/": LEVEL_MULTIPLICATIVE,
  "%": LEVEL_MULTIPLICATIVE,
  "+": LEVEL_ADDITIVE,
  "-": LEVEL_ADDITIVE,
  "<<": LEVEL_SHIFT,
  ">>": LEVEL_SHIFT,
  "&": LEVEL_BITWISE_AND,
  "|": LEVEL_BITWISE_OR,
  "^": LEVEL_BITWISE_OR,
  "<": LEVEL_INEQUALITY,
  "<=": LEVEL_INEQUALITY,
  ">": LEVEL_INEQUALITY,
  ">=": LEVEL_INEQUALITY,
  "==": LEVEL_EQUALITY,
  "!=": LEVEL_EQUALITY,
  "=~": LEVEL_EQUALITY,
  "!~": LEVEL_EQUALITY,
  "===": LEVEL_EQUALITY,
  "<=>": LEVEL_EQUALITY,
};

class Printer {
  indent: number = 0;
  buf: string = "";

  printProgram(program: ProgramNode): void {
    this.printStatements(program.statements);
  }

  printStatements(statements: StatementsNode): void {
    for (const statement of statements.body) {
      this.printStatement(statement);
    }
  }

  printStatement(statement: Node): void {
    this.printExpression(statement, LEVEL_STMT);
    this.print("\n");
  }

  printExpression(expression: Node, level: number): void {
    if (expression instanceof ParenthesesNode) {
      if (expression.body) {
        this.printExpression(expression.body, level);
      } else {
        this.print("nil");
      }
    } else if (expression instanceof StatementsNode) {
      if (expression.body.length === 0) {
        this.print("nil");
      } else if (expression.body.length === 1) {
        this.printExpression(expression.body[0], level);
      } else {
        this.print("begin\n");
        this.indent++;
        this.printStatements(expression);
        this.indent--;
        this.print("end");
      }
    } else if (expression instanceof SelfNode) {
      this.print("self");
    } else if (expression instanceof SourceLineNode) {
      this.print("__LINE__");
    } else if (expression instanceof SourceFileNode) {
      this.print("__FILE__");
    } else if (expression instanceof SourceEncodingNode) {
      this.print("__ENCODING__");
    } else if (expression instanceof TrueNode) {
      this.print("true");
    } else if (expression instanceof FalseNode) {
      this.print("false");
    } else if (expression instanceof NilNode) {
      this.print("nil");
    } else if (expression instanceof IntegerNode) {
      this.print(expression.value.toString());
    } else if (expression instanceof LocalVariableReadNode) {
      this.print(expression.name);
    } else if (expression instanceof CallNode) {
      this.printCallExpression(expression, level);
    } else if (expression instanceof LocalVariableWriteNode) {
      this.inParen(level, LEVEL_ASGN, () => {
        this.print(expression.name);
        this.print(" = ");
        this.printExpression(expression.value, LEVEL_ASGN);
      });
    } else {
      throw new StringifyError(
        `Unsupported expression type: ${expression.constructor.name}`
      );
    }
  }

  printCallExpression(expression: CallNode, level: number): void {
    const callClass = classifyCall(expression);
    if (callClass?.type === "unary") {
      const innerLevel = UNARY_LEVELS[callClass.op];
      this.inParen(level, innerLevel, () => {
        this.print(callClass.op);
        this.printExpression(callClass.operand, innerLevel);
      });
    } else if (callClass?.type === "binary") {
      const innerLevel = BINARY_LEVELS[callClass.op];
      const isRightAssociative = innerLevel === LEVEL_EXPONENTIAL;
      const isNonAssociative = innerLevel === LEVEL_EQUALITY;
      const leftLevel = isRightAssociative || isNonAssociative ? innerLevel - 1 : innerLevel;
      const rightLevel = !isRightAssociative || isNonAssociative ? innerLevel - 1 : innerLevel;
      this.inParen(level, innerLevel, () => {
        this.printExpression(callClass.lhs, leftLevel);
        this.print(` ${callClass.op} `);
        this.printExpression(callClass.rhs, rightLevel);
      });
    } else {
      this.inParen(level, LEVEL_CALL, () => {
        if (expression.receiver) {
          this.printExpression(expression.receiver, LEVEL_CALL);
          if (expression.isSafeNavigation()) {
            this.print("&.");
          } else {
            this.print(".");
          }
        }
        this.print(expression.name);
        if (expression.arguments_) {
          this.print("(");
          let first = true;
          for (const arg of expression.arguments_.arguments_) {
            if (!first) {
              this.print(", ");
            }
            first = false;
            this.printArgument(arg);
          }
          this.print(")");
        }
        if (expression.block instanceof BlockNode) {
          this.print(" do");
          if (expression.block.parameters instanceof BlockParametersNode) {
            this.print(" |");
            const params: Node[] = [
              ...expression.block.parameters.parameters?.requireds ?? [],
              ...expression.block.parameters.parameters?.optionals ?? [],
              ...expression.block.parameters.parameters?.rest ?
                [expression.block.parameters.parameters.rest] :
                [],
              ...expression.block.parameters.parameters?.posts ?? [],
              ...expression.block.parameters.parameters?.keywords ?? [],
              ...expression.block.parameters.parameters?.keywordRest ?
                [expression.block.parameters.parameters.keywordRest] :
                [],
              ...expression.block.parameters.parameters?.block ?
                [expression.block.parameters.parameters.block] :
                [],
            ];
            let first = true;
            for (const param of params) {
              if (!first) {
                this.print(", ");
              }
              first = false;
              if (param instanceof RequiredParameterNode) {
                this.print(param.name);
              } else if (param instanceof OptionalParameterNode) {
                this.print(param.name);
                this.print(" = ");
                this.printExpression(param.value, LEVEL_ASGN);
              } else if (param instanceof RestParameterNode) {
                this.print("*");
                if (param.name != null) {
                  this.print(param.name);
                }
              } else if (param instanceof RequiredKeywordParameterNode) {
                this.print(param.name);
                this.print(":");
              } else if (param instanceof OptionalKeywordParameterNode) {
                this.print(param.name);
                this.print(": ");
                this.printExpression(param.value, LEVEL_ASGN);
              } else if (param instanceof KeywordRestParameterNode) {
                this.print("**");
                if (param.name != null) {
                  this.print(param.name);
                }
              } else if (param instanceof BlockParameterNode) {
                this.print("&");
                if (param.name != null) {
                  this.print(param.name);
                }
              } else {
                throw new StringifyError(
                  `Unsupported parameter type: ${param.constructor.name}`
                );
              }
            }
            this.print("|");
          }
          this.print("\n");
          this.indent++;
          if (expression.block.body instanceof StatementsNode) {
            this.printStatements(expression.block.body);
          }
          this.indent--;
          this.print("end");
        }
      });
    }
  }

  inParen(outerLevel: number, innerLevel: number, cb: () => void): void {
    if (innerLevel > outerLevel) {
      this.print("(");
      cb();
      this.print(")");
    } else {
      cb();
    }
  }

  printArgument(arg: Node): void {
    this.printExpression(arg, LEVEL_STMT);
  }

  print(text: string): void {
    for (const line of text.split(/^/m)) {
      if (this.buf.endsWith("\n") && line !== "\n") {
        this.buf += INDENT_UNIT.repeat(this.indent);
      }
      this.buf += line;
    }
  }
}

type UnOpCall = {
  type: "unary";
  op: string;
  operand: Node;
};
type BinOpCall = {
  type: "binary";
  lhs: Node;
  op: string;
  rhs: Node;
};
type ArefCall = {
  type: "aref";
  receiver: Node;
  args: Node[];
};
type AsetCall = {
  type: "aset";
  receiver: Node;
  args: Node[];
  value: Node;
};
type SetCall = {
  type: "set";
  receiver: Node;
  name: string;
  value: Node;
};

const UNARY_OP_NAMES = new Set([
  "+@",
  "-@",
  "!",
  "~",
]);
const BINARY_OP_NAMES = new Set([
  "**",
  "*",
  "/",
  "%",
  "+",
  "-",
  "<<",
  ">>",
  "&",
  "|",
  "^",
  "<",
  "<=",
  ">",
  ">=",
  "==",
  "!=",
  "=~",
  "!~",
  "===",
  "<=>",
]);

function classifyCall(call: CallNode): UnOpCall | BinOpCall | ArefCall | AsetCall | SetCall | null {
  if (call.isAttributeWrite()) {
    if (
      call.name === "[]=" &&
      call.arguments_ &&
      call.arguments_.arguments_.length >= 1 &&
      isSimpleArg(call.arguments_.arguments_.at(-1)!) &&
      !call.block
    ) {
      return {
        type: "aset",
        receiver: call.receiver ?? new SelfNode(0, DUMMY_LOCATION, 0),
        args: call.arguments_.arguments_.slice(0, call.arguments_.arguments_.length - 1),
        value: call.arguments_.arguments_.at(-1)!,
      };
    }
    if (
      call.name !== "[]=" &&
      call.name.endsWith("=") &&
      call.arguments_ &&
      call.arguments_.arguments_.length == 1 &&
      isSimpleArg(call.arguments_.arguments_[0]) &&
      !call.block
    ) {
      return {
        type: "set",
        receiver: call.receiver ?? new SelfNode(0, DUMMY_LOCATION, 0),
        name: call.name.slice(0, -1),
        value: call.arguments_.arguments_[0],
      };
    }
    throw new StringifyError("Found invalid attribute write");
  }
  if (
    UNARY_OP_NAMES.has(call.name) &&
    (!call.arguments_ || call.arguments_.arguments_.length === 0) &&
    !call.block
  ) {
    return {
      type: "unary",
      op: call.name,
      operand: call.receiver ?? new SelfNode(0, DUMMY_LOCATION, 0),
    };
  }
  if (
    BINARY_OP_NAMES.has(call.name) &&
    call.arguments_ &&
    call.arguments_.arguments_.length === 1 &&
    isSimpleArg(call.arguments_.arguments_[0]) &&
    !call.block
  ) {
    return {
      type: "binary",
      lhs: call.receiver ?? new SelfNode(0, DUMMY_LOCATION, 0),
      op: call.name,
      rhs: call.arguments_.arguments_[0],
    };
  }
  if (
    call.name === "[]" &&
    (!call.block || call.block instanceof BlockArgumentNode)
  ) {
    return {
      type: "aref",
      receiver: call.receiver ?? new SelfNode(0, DUMMY_LOCATION, 0),
      args: [
        ...call.arguments_ ? call.arguments_.arguments_ : [],
        ...call.block ? [call.block] : [],
      ],
    }
  }
  return null;
}

function isSimpleArg(arg: Node): boolean {
  return !(
    arg instanceof SplatNode ||
    arg instanceof KeywordHashNode
  );
}

const DUMMY_LOCATION: Location = {
  startOffset: 0,
  length: 0
}
