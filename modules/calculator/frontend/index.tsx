import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@alexos/ui";

export interface CalculatorWidgetProps {
  eventBus?: unknown;
  apiBaseUrl?: string;
}

type Operator = "+" | "-" | "*" | "/";

interface CalculatorState {
  display: string;
  previousValue: number | null;
  operator: Operator | null;
  waitingForOperand: boolean;
}

const INITIAL_STATE: CalculatorState = {
  display: "0",
  previousValue: null,
  operator: null,
  waitingForOperand: false,
};

// Real arithmetic - no eval(). Tracks operand/operator/pending-operator
// state the way a physical four-function calculator does.
function applyOperator(a: number, b: number, operator: Operator): number {
  switch (operator) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "*":
      return a * b;
    case "/":
      return b === 0 ? NaN : a / b;
    default:
      return b;
  }
}

function inputDigit(state: CalculatorState, digit: string): CalculatorState {
  if (state.waitingForOperand) {
    return { ...state, display: digit, waitingForOperand: false };
  }
  return { ...state, display: state.display === "0" ? digit : state.display + digit };
}

function inputDecimal(state: CalculatorState): CalculatorState {
  if (state.waitingForOperand) {
    return { ...state, display: "0.", waitingForOperand: false };
  }
  if (state.display.includes(".")) return state;
  return { ...state, display: `${state.display}.` };
}

function inputOperator(state: CalculatorState, operator: Operator): CalculatorState {
  const inputValue = Number.parseFloat(state.display);

  if (state.previousValue === null) {
    return { display: state.display, previousValue: inputValue, operator, waitingForOperand: true };
  }

  if (state.waitingForOperand) {
    return { ...state, operator };
  }

  const result = applyOperator(state.previousValue, inputValue, state.operator ?? operator);
  return {
    display: Number.isNaN(result) ? "Error" : String(result),
    previousValue: result,
    operator,
    waitingForOperand: true,
  };
}

function inputEquals(state: CalculatorState): CalculatorState {
  const inputValue = Number.parseFloat(state.display);
  if (state.operator === null || state.previousValue === null) return state;
  const result = applyOperator(state.previousValue, inputValue, state.operator);
  return {
    display: Number.isNaN(result) ? "Error" : String(result),
    previousValue: null,
    operator: null,
    waitingForOperand: true,
  };
}

function toggleSign(state: CalculatorState): CalculatorState {
  const value = Number.parseFloat(state.display);
  if (Number.isNaN(value) || value === 0) return state;
  return { ...state, display: String(value * -1) };
}

function applyPercent(state: CalculatorState): CalculatorState {
  const value = Number.parseFloat(state.display);
  if (Number.isNaN(value)) return state;
  return { ...state, display: String(value / 100) };
}

const BUTTON_CLASS =
  "flex h-14 items-center justify-center rounded-button border border-border bg-background-secondary text-title text-text-primary transition-colors duration-base ease-out hover:bg-surface-hover";
const OPERATOR_CLASS =
  "flex h-14 items-center justify-center rounded-button border border-accent-primary/40 bg-accent-primary/10 text-title text-accent-primary transition-colors duration-base ease-out hover:bg-accent-primary/20";

/** Fully client-side - custom operand/operator state machine, no eval(). */
export default function CalculatorWidget(_props: CalculatorWidgetProps) {
  const [state, setState] = useState<CalculatorState>(INITIAL_STATE);

  const digitPress = (digit: string) => setState((current) => inputDigit(current, digit));
  const operatorPress = (operator: Operator) => setState((current) => inputOperator(current, operator));
  const equalsPress = () => setState((current) => inputEquals(current));
  const clearPress = () => setState(INITIAL_STATE);
  const decimalPress = () => setState((current) => inputDecimal(current));
  const signPress = () => setState((current) => toggleSign(current));
  const percentPress = () => setState((current) => applyPercent(current));

  return (
    <Card>
      <CardHeader
        icon={
          <span className="material-symbols-rounded" aria-hidden>
            calculate
          </span>
        }
      >
        <CardTitle>Calculator</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="overflow-x-auto rounded-button border border-border bg-background-secondary px-4 py-4 text-right text-heading font-semibold tabular-nums text-text-primary">
          {state.display}
        </p>

        <div className="grid grid-cols-4 gap-2">
          <button type="button" className={BUTTON_CLASS} onClick={clearPress}>
            C
          </button>
          <button type="button" className={BUTTON_CLASS} onClick={signPress}>
            +/-
          </button>
          <button type="button" className={BUTTON_CLASS} onClick={percentPress}>
            %
          </button>
          <button type="button" className={OPERATOR_CLASS} onClick={() => operatorPress("/")}>
            &divide;
          </button>

          <button type="button" className={BUTTON_CLASS} onClick={() => digitPress("7")}>
            7
          </button>
          <button type="button" className={BUTTON_CLASS} onClick={() => digitPress("8")}>
            8
          </button>
          <button type="button" className={BUTTON_CLASS} onClick={() => digitPress("9")}>
            9
          </button>
          <button type="button" className={OPERATOR_CLASS} onClick={() => operatorPress("*")}>
            &times;
          </button>

          <button type="button" className={BUTTON_CLASS} onClick={() => digitPress("4")}>
            4
          </button>
          <button type="button" className={BUTTON_CLASS} onClick={() => digitPress("5")}>
            5
          </button>
          <button type="button" className={BUTTON_CLASS} onClick={() => digitPress("6")}>
            6
          </button>
          <button type="button" className={OPERATOR_CLASS} onClick={() => operatorPress("-")}>
            &minus;
          </button>

          <button type="button" className={BUTTON_CLASS} onClick={() => digitPress("1")}>
            1
          </button>
          <button type="button" className={BUTTON_CLASS} onClick={() => digitPress("2")}>
            2
          </button>
          <button type="button" className={BUTTON_CLASS} onClick={() => digitPress("3")}>
            3
          </button>
          <button type="button" className={OPERATOR_CLASS} onClick={() => operatorPress("+")}>
            +
          </button>

          <button type="button" className={`${BUTTON_CLASS} col-span-2`} onClick={() => digitPress("0")}>
            0
          </button>
          <button type="button" className={BUTTON_CLASS} onClick={decimalPress}>
            .
          </button>
          <button
            type="button"
            className="flex h-14 items-center justify-center rounded-button border border-accent-primary bg-accent-primary text-title text-text-primary transition-colors duration-base ease-out hover:bg-accent-primary/90"
            onClick={equalsPress}
          >
            =
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
