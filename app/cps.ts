import { ArgumentsNode, BlockNode, CallNode, LocalVariableReadNode, Location, NilNode, Node, ProgramNode, StatementsNode } from "@ruby/prism";

export class CPSError extends Error {
  static {
    this.prototype.name = "CPSError";
  }
}

export function cpsProgram(program: ProgramNode): ProgramNode {
  const cont: Cont = (result: Node | null) => new CallNode(
    0,
    DUMMY_LOCATION,
    0,
    new LocalVariableReadNode(
      0,
      DUMMY_LOCATION,
      0,
      "cont",
      0
    ),
    null,
    "call",
    null,
    null,
    new ArgumentsNode(
      0,
      DUMMY_LOCATION,
      0,
      [result ?? new NilNode(0, DUMMY_LOCATION, 0)]
    ),
    null,
    null
  );
  const statementsCont = cpsStatements(program.statements, cont);
  const expr = statementsCont(null);
  return new ProgramNode(
    0,
    program.location,
    0,
    program.locals,
    new StatementsNode(
      0,
      program.location,
      0,
      [expr]
    ),
  );
}

type Cont = (result: Node | null) => Node;

function cpsStatements(statements: StatementsNode, cont: Cont): Cont {
  if (statements.body.length === 0) {
    return cont;
  }
  let currentCont: Cont = cont;
  for (const statement of statements.body.reverse()) {
    currentCont = cpsExpression(statement, currentCont);
  }
  return currentCont;
}

function cpsExpression(expression: Node, cont: Cont): Cont {
  return (result: Node | null) =>
    result
      ? new CallNode(
          0,
          DUMMY_LOCATION,
          0,
          result,
          null,
          "then",
          null,
          null,
          null,
          null,
          new BlockNode(
            0,
            DUMMY_LOCATION,
            0,
            [],
            null,
            cont(expression),
            DUMMY_LOCATION,
            DUMMY_LOCATION
          ),
        )
      : cont(expression);
}

const DUMMY_LOCATION: Location = {
  startOffset: 0,
  length: 0,
};
