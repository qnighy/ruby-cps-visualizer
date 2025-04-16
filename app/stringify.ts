import { IntegerNode, Node, ProgramNode, StatementsNode } from "@ruby/prism";

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
    if (statement instanceof IntegerNode) {
      this.buf += statement.value.toString();
    } else {
      throw new StringifyError(
        `Unsupported statement type: ${statement.constructor.name}`
      );
    }
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
