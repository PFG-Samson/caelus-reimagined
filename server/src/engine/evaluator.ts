import { RiskRule, WeatherSignal, Insight, Operator, Severity } from './types';

const severityWeights: Record<Severity, number> = {
  info: 1,
  warning: 2,
  danger: 3,
  critical: 4,
};

function evaluateCondition(value: number, operator: Operator, threshold: number): boolean {
  switch (operator) {
    case '>': return value > threshold;
    case '<': return value < threshold;
    case '>=': return value >= threshold;
    case '<=': return value <= threshold;
    case '==': return value === threshold;
    default: return false;
  }
}

export function evaluate(signals: WeatherSignal[], rules: RiskRule[]): Insight[] {
  const insights: Insight[] = [];
  const now = new Date().toISOString();

  for (const rule of rules) {
    const signal = signals.find((s) => s.name === rule.signal);

    if (signal !== undefined) {
      const isMatched = evaluateCondition(signal.value, rule.operator, rule.threshold);

      if (isMatched) {
        insights.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: rule.message,
          category: rule.category,
          signal: signal,
          triggeredAt: now,
        });
      }
    }
  }

  // Sort insights by severity (highest first)
  return insights.sort((a, b) => severityWeights[b.severity] - severityWeights[a.severity]);
}
