import { ArgumentsNode, BeginNode, BlockArgumentNode, BlockNode, BlockParametersNode, CallNode, LocalVariableReadNode, Location, NilNode, Node, ParametersNode, ParenthesesNode, ProgramNode, RequiredParameterNode, StatementsNode } from "@ruby/prism";

export class CPSError extends Error {
  static {
    this.prototype.name = "CPSError";
  }
}

export function cpsProgram(program: ProgramNode): ProgramNode {
  return new CPSTransformer().cpsProgram(program);
}

type Hole<T> = (value: T) => void;

class CPSTransformer {
  intermiediateVariableCounter: number = 1;
  contVariableCounter: number = 1;

  cpsProgram(program: ProgramNode): ProgramNode {
    const result = new ProgramNode(
      0,
      DUMMY_LOCATION,
      0,
      [],
      new StatementsNode(
        0,
        DUMMY_LOCATION,
        0,
        [dummyNode()],
      ),
    );
    const initialHole: Hole<Node> = (value: Node) => {
      result.statements.body[0] = value;
    };
    const [finalHole, finalVar] = this.cpsStatements(program.statements, initialHole, true);
    finalHole(
      new CallNode(
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
          [new LocalVariableReadNode(
            0,
            DUMMY_LOCATION,
            0,
            finalVar,
            0
          )]
        ),
        null,
        null
      )
    );
    return result;
  }

  cpsStatements(
    statements: StatementsNode,
    givenHole: Hole<Node>,
    needResult: boolean
  ): [Hole<Node>, string] {
    const [init, last] =
      needResult
        ? [
            statements.body.slice(0, statements.body.length - 1),
            statements.body[statements.body.length - 1] ?? new NilNode(0, DUMMY_LOCATION, 0),
          ]
        : [statements.body, new NilNode(0, DUMMY_LOCATION, 0)];
    let hole = givenHole;
    for (const statement of init) {
      const [newHole] = this.cpsExpression(statement, hole, false);
      hole = newHole;
    }
    if (needResult) {
      return this.cpsExpression(last, hole, true);
    } else {
      return [hole, ""];
    }
  }

  cpsExpression(
    expression: Node,
    givenHole: Hole<Node>,
    needResult: boolean,
  ): [Hole<Node>, string] {
    if (expression instanceof StatementsNode) {
      return this.cpsStatements(expression, givenHole, needResult);
    } else if (expression instanceof ParenthesesNode) {
      if (expression.body) {
        return this.cpsExpression(expression.body, givenHole, needResult);
      }
    } else if (expression instanceof BeginNode) {
      if (
        expression.statements &&
        !expression.rescueClause &&
        !expression.elseClause &&
        !expression.ensureClause
      ) {
        return this.cpsStatements(expression.statements, givenHole, needResult);
      }
    } else if (expression instanceof CallNode) {
      if (!(expression.block instanceof BlockNode)) {
        let hole = givenHole;
        let receiver: Node | null = null;
        if (expression.receiver) {
          const [newHole, varName] = this.cpsExpression(expression.receiver, hole, true);
          hole = newHole;
          receiver = new LocalVariableReadNode(
            0,
            DUMMY_LOCATION,
            0,
            varName,
            0
          );
        }
        const args: Node[] = [];
        if (expression.arguments_) {
          for (const arg of expression.arguments_.arguments_) {
            const [newHole, varName] = this.cpsExpression(arg, hole, true);
            hole = newHole;
            args.push(new LocalVariableReadNode(
              0,
              DUMMY_LOCATION,
              0,
              varName,
              0
            ));
          }
        }
        let blockArg: Node | null = null;
        if (expression.block instanceof BlockArgumentNode) {
          const blockArgName = this.freshIntermediate();
          blockArg = new LocalVariableReadNode(
            0,
            DUMMY_LOCATION,
            0,
            blockArgName,
            0
          );
          hole = (value: Node) => {
            ((expression.block as BlockNode).body as StatementsNode).body[0] = value;
          };
        }
        const varName = needResult ? this.freshIntermediate() : null;
        const e = thenCall(
          new CallNode(
            0,
            DUMMY_LOCATION,
            0,
            receiver,
            null,
            expression.name,
            null,
            null,
            new ArgumentsNode(
              0,
              DUMMY_LOCATION,
              0,
              args
            ),
            null,
            blockArg,
          ),
          varName,
          dummyNode(),
        );
        hole(e);
        hole = (value: Node) => {
          ((e.block as BlockNode).body as StatementsNode).body[0] = value;
        };
        return [hole, varName ?? ""];
      }
    }
    return this.cpsExpressionFallback(expression, givenHole, needResult);
  }

  cpsExpressionFallback(
    expression: Node,
    givenHole: Hole<Node>,
    needResult: boolean,
  ): [Hole<Node>, string] {
    const varName = needResult ? this.freshIntermediate() : null;
    const e = thenCall(
      expression,
      varName,
      dummyNode(),
    );
    givenHole(e);
    const hole: Hole<Node> = (value: Node) => {
      ((e.block as BlockNode).body as StatementsNode).body[0] = value;
    };
    return [hole, varName ?? ""];
  }

  freshIntermediate(): string {
    return `e${this.intermiediateVariableCounter++}`;
  }
  freshContVar(): string {
    return `c${this.contVariableCounter++}`;
  }
}

function thenCall(
  recv: Node,
  local: string | null,
  body: Node
): CallNode {
  return new CallNode(
    0,
    DUMMY_LOCATION,
    0,
    recv,
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
      local == null
        ? null
        : new BlockParametersNode(
            0,
            DUMMY_LOCATION,
            0,
            new ParametersNode(
              0,
              DUMMY_LOCATION,
              0,
              [
                new RequiredParameterNode(
                  0,
                  DUMMY_LOCATION,
                  0,
                  local
                ),
              ],
              [],
              null,
              [],
              [],
              null,
              null
            ),
            [],
            null,
            null
          ),
      new StatementsNode(
        0,
        DUMMY_LOCATION,
        0,
        [body],
      ),
      DUMMY_LOCATION,
      DUMMY_LOCATION
    ),
  )
}

function dummyNode(): Node {
  return new NilNode(0, DUMMY_LOCATION, 0);
}

const DUMMY_LOCATION: Location = {
  startOffset: 0,
  length: 0,
};
