import { BlockNode, BlockParameterNode, BlockParametersNode, CallNode, FalseNode, IntegerNode, KeywordRestParameterNode, LocalVariableReadNode, LocalVariableWriteNode, NilNode, Node, OptionalKeywordParameterNode, OptionalParameterNode, ProgramNode, RequiredKeywordParameterNode, RequiredParameterNode, RestParameterNode, SelfNode, SourceEncodingNode, SourceFileNode, SourceLineNode, StatementsNode, TrueNode } from "@ruby/prism";

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
const LEVEL_ASGN = 3;
const LEVEL_STMT = 4;

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
    if (expression instanceof SelfNode) {
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
