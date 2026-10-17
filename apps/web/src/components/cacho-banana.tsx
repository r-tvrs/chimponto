/** Indicador de progresso das 4 batidas do dia. Bananas vazias usam currentColor. */
const ROT = [40, 14, -14, -40];
const D = "M-2 2C-11 14-7 31 7 37C1 27 2 14 4 2Z";

export function CachoBanana({
  n,
  size = 34,
  className,
}: {
  n: number;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`${n} de 4 batidas`}
    >
      {ROT.map((r, i) => {
        const on = i < n;
        return (
          <g key={i} transform={`translate(32 11) rotate(${r}) scale(1.15)`}>
            <path
              d={D}
              fill={on ? "#FFD23F" : "none"}
              stroke={on ? "#D49F00" : "currentColor"}
              strokeOpacity={on ? 1 : 0.45}
              strokeWidth={on ? 1.6 : 1.8}
              strokeLinejoin="round"
            />
          </g>
        );
      })}
      <circle cx="32" cy="9" r="4.5" fill="#7A5A2A" />
    </svg>
  );
}
