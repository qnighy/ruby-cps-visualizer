import { CallNode, IntegerNode, LocalVariableReadNode, LocalVariableWriteNode, Node, ProgramNode, StatementsNode } from "@ruby/prism";

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
const LEVEL_PRIMARY = 1;
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
    const innerLevel = this.levelOfExpression(expression);
    if (innerLevel > level) {
      this.print("(");
      this.printExpression(expression, innerLevel);
      this.print(")");
      return;
    }
    if (expression instanceof IntegerNode) {
      this.buf += expression.value.toString();
    } else if (expression instanceof LocalVariableReadNode) {
      this.print(expression.name);
    } else if (expression instanceof CallNode) {
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
    } else if (expression instanceof LocalVariableWriteNode) {
      this.print(expression.name);
      this.print(" = ");
      this.printExpression(expression.value, LEVEL_ASGN);
    } else {
      throw new StringifyError(
        `Unsupported expression type: ${expression.constructor.name}`
      );
    }
  }

  levelOfExpression(expression: Node): number {
    if (expression instanceof IntegerNode) {
      return LEVEL_PRIMARY;
    } else if (expression instanceof LocalVariableReadNode) {
      return LEVEL_PRIMARY;
    } else if (expression instanceof CallNode) {
      return LEVEL_CALL;
    } else if (expression instanceof LocalVariableWriteNode) {
      return LEVEL_ASGN;
    } else {
      throw new StringifyError(
        `Unsupported expression type: ${expression.constructor.name}`
      );
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
