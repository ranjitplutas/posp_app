export function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <>
      <div className="do-togglegroup-buttons" style={{ gap: 2, background: "var(--color-bg)", borderRadius: 6, padding: 3 }}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              onClick={() => onChange(o.value)}
              style={{
                padding: "5px 11px",
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 5,
                border: "none",
                background: active ? "var(--color-primary-dark)" : "transparent",
                color: active ? "#fff" : "var(--color-text-muted)",
                letterSpacing: 0.3,
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <select
        className="do-togglegroup-select"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid var(--color-line)", fontSize: 12.5, fontWeight: 600 }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </>
  );
}
