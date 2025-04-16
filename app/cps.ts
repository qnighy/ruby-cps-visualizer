import { ArgumentsNode, BeginNode, BlockArgumentNode, BlockNode, BlockParametersNode, CallNode, FalseNode, LocalVariableReadNode, Location, NilNode, Node, ParametersNode, ParenthesesNode, ProgramNode, RequiredParameterNode, SelfNode, SourceEncodingNode, SourceFileNode, SourceLineNode, StatementsNode, TrueNode } from "@ruby/prism";

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
  currentHole: Hole<Node> | null = null;

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
    this.currentHole = (value: Node) => {
      result.statements.body[0] = value;
    };
    const finalVar = this.cpsStatements(program.statements, true);
    this.fill(
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
          [finalVar]
        ),
        null,
        null
      )
    );
    return result;
  }

  cpsStatements(statements: StatementsNode, needResult: true): Node;
  cpsStatements(statements: StatementsNode, needResult: false): null;
  cpsStatements(statements: StatementsNode, needResult: boolean): Node | null;
  cpsStatements(statements: StatementsNode, needResult: boolean): Node | null {
    const [init, last] =
      needResult
        ? [
            statements.body.slice(0, statements.body.length - 1),
            statements.body[statements.body.length - 1] ?? new NilNode(0, DUMMY_LOCATION, 0),
          ]
        : [statements.body, new NilNode(0, DUMMY_LOCATION, 0)];
    for (const statement of init) {
      this.cpsExpression(statement, false);
    }
    if (needResult) {
      return this.cpsExpression(last, true);
    } else {
      return null;
    }
  }

  cpsExpression(expression: Node, needResult: true): Node;
  cpsExpression(expression: Node, needResult: false): null;
  cpsExpression(expression: Node, needResult: boolean): Node | null;
  cpsExpression(expression: Node, needResult: boolean): Node | null {
    if (expression instanceof StatementsNode) {
      return this.cpsStatements(expression, needResult);
    } else if (expression instanceof ParenthesesNode) {
      if (expression.body) {
        return this.cpsExpression(expression.body, needResult);
      }
    } else if (expression instanceof BeginNode) {
      if (
        expression.statements &&
        !expression.rescueClause &&
        !expression.elseClause &&
        !expression.ensureClause
      ) {
        return this.cpsStatements(expression.statements, needResult);
      }
    } else if (
      expression instanceof SelfNode ||
      expression instanceof SourceLineNode ||
      expression instanceof SourceFileNode ||
      expression instanceof SourceEncodingNode ||
      expression instanceof TrueNode ||
      expression instanceof FalseNode ||
      expression instanceof NilNode ||
      expression instanceof LocalVariableReadNode
    ) {
      // No CPS for variable-likes
      return needResult ? expression : null;
    } else if (expression instanceof CallNode) {
      if (!(expression.block instanceof BlockNode)) {
        let receiver: Node | null = null;
        if (expression.receiver) {
          receiver = this.cpsExpression(expression.receiver, true);
        }
        const args: Node[] = [];
        if (expression.arguments_) {
          for (const arg of expression.arguments_.arguments_) {
            args.push(this.cpsExpression(arg, true));
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
          this.currentHole = (value: Node) => {
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
        this.fill(e);
        this.currentHole = (value: Node) => {
          ((e.block as BlockNode).body as StatementsNode).body[0] = value;
        };
        return (
          needResult
            ? new LocalVariableReadNode(
                0,
                DUMMY_LOCATION,
                0,
                varName ?? "",
                0
              )
            : null
        );
      }
    }
    return this.cpsExpressionFallback(expression, needResult);
  }

  cpsExpressionFallback(expression: Node, needResult: true): Node;
  cpsExpressionFallback(expression: Node, needResult: false): null;
  cpsExpressionFallback(expression: Node, needResult: boolean): Node | null;
  cpsExpressionFallback(expression: Node, needResult: boolean): Node | null {
    const varName = needResult ? this.freshIntermediate() : null;
    const e = thenCall(
      expression,
      varName,
      dummyNode(),
    );
    this.fill(e);
    this.currentHole = (value: Node) => {
      ((e.block as BlockNode).body as StatementsNode).body[0] = value;
    };
    return (
      needResult
        ? new LocalVariableReadNode(
            0,
            DUMMY_LOCATION,
            0,
            varName ?? "",
            0
          )
        : null
    );
  }

  fill(value: Node) {
    if (!this.currentHole) {
      throw new CPSError("Internal error: no hole to fill");
    }
    this.currentHole(value);
    this.currentHole = null;
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
