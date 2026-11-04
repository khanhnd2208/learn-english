export default function TestScoreTrail({ percent, passed }: { percent: number; passed: boolean }) {
  return <span className="block text-right">
    <span className="block font-bold tabular-nums">{percent}%</span>
    <span className={`block text-xs ${passed ? 'text-success' : 'text-error'}`}>{passed ? 'Đạt' : 'Chưa đạt'}</span>
  </span>;
}
