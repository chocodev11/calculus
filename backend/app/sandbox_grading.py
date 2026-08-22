import ast
import math
import operator
import re
from fractions import Fraction
from typing import Any


GRADER_VERSION = "sandbox-v1"


def _finite_number(value: Any) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError("Expected a finite number")
    return float(value)


def _canonical_scalar(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return format(_finite_number(value), ".12g")
    if value is None:
        return "null"
    if isinstance(value, str):
        return value.strip()
    return repr(value)


def canonical_set(value: Any) -> list[Any]:
    if isinstance(value, dict) and value.get("kind") == "finite_set":
        values = value.get("elements", [])
    elif isinstance(value, list):
        values = value
    else:
        raise ValueError("Expected a finite set")
    unique: dict[str, Any] = {}
    for item in values:
        unique[_canonical_scalar(item)] = item
    return [unique[key] for key in sorted(unique)]


def canonical_interval(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict) or value.get("kind") != "interval":
        raise ValueError("Expected an interval")
    left = value.get("left")
    right = value.get("right")
    if left is not None:
        left = _finite_number(left)
    if right is not None:
        right = _finite_number(right)
    if left is not None and right is not None and left > right:
        raise ValueError("Interval boundaries are reversed")
    return {
        "kind": "interval",
        "left": left,
        "right": right,
        "leftClosed": bool(value.get("leftClosed")),
        "rightClosed": bool(value.get("rightClosed")),
    }


def _same_number(left: Any, right: Any, tolerance: float) -> bool:
    return abs(_finite_number(left) - _finite_number(right)) <= tolerance


def _safe_expression(expression: str, variables: dict[str, float]) -> float:
    if not isinstance(expression, str) or len(expression) > 1000:
        raise ValueError("Expression is invalid or too long")
    tree = ast.parse(expression.replace("^", "**"), mode="eval")
    nodes = list(ast.walk(tree))
    if len(nodes) > 256:
        raise ValueError("Expression is too complex")
    stack = [(tree, 0)]
    while stack:
        node, depth = stack.pop()
        if depth > 32:
            raise ValueError("Expression is too deep")
        stack.extend((child, depth + 1) for child in ast.iter_child_nodes(node))
    functions = {
        "abs": abs,
        "sqrt": math.sqrt,
        "sin": math.sin,
        "cos": math.cos,
        "tan": math.tan,
        "log": math.log,
        "exp": math.exp,
        "pow": pow,
    }
    binary = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.Pow: operator.pow,
    }
    unary = {ast.UAdd: operator.pos, ast.USub: operator.neg}
    steps = 0

    def visit(node: ast.AST) -> float:
        nonlocal steps
        steps += 1
        if steps > 500:
            raise ValueError("Expression is too complex")
        if isinstance(node, ast.Expression):
            return visit(node.body)
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)) and not isinstance(node.value, bool):
            return _finite_number(node.value)
        if isinstance(node, ast.Name) and node.id in variables:
            return _finite_number(variables[node.id])
        if isinstance(node, ast.BinOp) and type(node.op) in binary:
            left = visit(node.left)
            right = visit(node.right)
            if isinstance(node.op, ast.Div) and right == 0:
                raise ValueError("Division by zero")
            if isinstance(node.op, ast.Pow) and abs(right) > 1000:
                raise ValueError("Exponent is too large")
            return _finite_number(binary[type(node.op)](left, right))
        if isinstance(node, ast.UnaryOp) and type(node.op) in unary:
            return _finite_number(unary[type(node.op)](visit(node.operand)))
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in functions:
            if node.keywords:
                raise ValueError("Keyword arguments are not allowed")
            args = [visit(arg) for arg in node.args]
            if node.func.id == "pow" and len(args) >= 2 and abs(args[1]) > 1000:
                raise ValueError("Exponent is too large")
            return _finite_number(functions[node.func.id](*args))
        raise ValueError("Expression contains a disallowed construct")

    return visit(tree)


def expression_equivalent(answer: Any, expected: Any) -> bool:
    if not isinstance(answer, str) or not isinstance(expected, str):
        return False
    samples = (-1.37, -0.41, 0.27, 1.19, 2.43)
    valid_samples = 0
    for sample in samples:
        try:
            left = _safe_expression(answer, {"x": sample, "p": sample})
            right = _safe_expression(expected, {"x": sample, "p": sample})
        except (ValueError, SyntaxError, ZeroDivisionError, OverflowError):
            continue
        valid_samples += 1
        if abs(left - right) > 1e-8:
            return False
    return valid_samples >= 3


def _fraction(value: Any) -> Fraction:
    if isinstance(value, Fraction):
        return value
    if isinstance(value, int) and not isinstance(value, bool):
        return Fraction(value)
    if isinstance(value, str) and re.fullmatch(r"[-+]?\d+(?:/[-+]?\d+)?", value.strip()):
        return Fraction(value.strip())
    raise ValueError("Invalid fraction")


def _normalized_text(value: Any) -> str:
    if not isinstance(value, str):
        value = str(value)
    return " ".join(value.strip().casefold().split())


def grade_answer(item_type: str, answer: Any, answer_key: Any) -> dict[str, Any]:
    try:
        if item_type == "choice":
            normalized = _normalized_text(answer)
            expected = answer_key.get("value") if isinstance(answer_key, dict) else answer_key
            correct = normalized == _normalized_text(expected)
        elif item_type in {"boolean_group", "truth_table"}:
            expected_values = answer_key.get("values") if isinstance(answer_key, dict) else answer_key
            if not isinstance(answer, list) or not isinstance(expected_values, list):
                raise ValueError("Expected a boolean list")
            if any(not isinstance(value, bool) for value in answer + expected_values):
                raise ValueError("Boolean group values must be boolean")
            normalized = list(answer)
            expected = list(expected_values)
            correct = len(normalized) == len(expected) and normalized == expected
        elif item_type in {"short_answer", "text_input"}:
            accepted = answer_key.get("accepted", []) if isinstance(answer_key, dict) else [answer_key]
            normalized = _normalized_text(answer)
            correct = normalized in {_normalized_text(value) for value in accepted}
        elif item_type == "set":
            normalized = canonical_set(answer)
            correct = normalized == canonical_set(answer_key)
        elif item_type == "interval":
            normalized = canonical_interval(answer)
            expected = canonical_interval(answer_key)
            correct = normalized["leftClosed"] == expected["leftClosed"] and normalized["rightClosed"] == expected["rightClosed"]
            correct = correct and (
                normalized["left"] == expected["left"]
                if normalized["left"] is None or expected["left"] is None
                else _same_number(normalized["left"], expected["left"], 1e-9)
            )
            correct = correct and (
                normalized["right"] == expected["right"]
                if normalized["right"] is None or expected["right"] is None
                else _same_number(normalized["right"], expected["right"], 1e-9)
            )
        elif item_type in {"numeric", "angle", "quantity"}:
            expected_value = answer_key.get("value") if isinstance(answer_key, dict) else answer_key
            tolerance = float(answer_key.get("tolerance", 1e-9)) if isinstance(answer_key, dict) else 1e-9
            normalized = _finite_number(answer)
            if item_type == "angle":
                unit = answer_key.get("unit", "degree") if isinstance(answer_key, dict) else "degree"
                period = 2 * math.pi if unit == "radian" else 360
                normalized %= period
                expected_value = _finite_number(expected_value) % period
                distance = min(abs(normalized - expected_value), period - abs(normalized - expected_value))
                correct = distance <= tolerance
            else:
                correct = _same_number(normalized, expected_value, tolerance)
        elif item_type == "fraction":
            normalized_fraction = _fraction(answer)
            expected_fraction = _fraction(answer_key)
            normalized = str(normalized_fraction)
            correct = normalized_fraction == expected_fraction
        elif item_type == "expression":
            normalized = str(answer).strip()
            correct = expression_equivalent(normalized, answer_key)
        elif item_type in {"ordered_steps", "structured_reasoning"}:
            normalized = answer
            if isinstance(answer_key, dict):
                accepted_paths = answer_key.get("acceptedPaths", answer_key.get("accepted_paths", []))
                correct = bool(accepted_paths) and any(answer == path for path in accepted_paths)
            else:
                correct = normalized == answer_key
        else:
            raise ValueError(f"Unsupported assessment type: {item_type}")
        return {"correct": bool(correct), "normalized_answer": normalized, "grader_version": GRADER_VERSION}
    except (TypeError, ValueError, SyntaxError, OverflowError, ZeroDivisionError) as exc:
        return {"correct": False, "normalized_answer": None, "grader_version": GRADER_VERSION, "reason": str(exc)}
