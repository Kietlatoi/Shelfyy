import { MaterialIcon } from './MaterialIcon'

function ComparisonCell({ isPro, value }) {
  if (value === 'remove') {
    return (
      <span className="material-symbols-outlined text-text-muted opacity-40">remove</span>
    )
  }

  if (value === 'check_circle') {
    return <MaterialIcon name="check_circle" filled={isPro} className={isPro ? 'text-secondary' : 'text-primary'} />
  }

  return (
    <span className={isPro ? 'font-bold text-secondary' : 'text-on-surface-variant'}>
      {value}
    </span>
  )
}

export function PremiumComparison({ data }) {
  return (
    <section className="mt-32">
      <h4 className="font-headline-md text-headline-md text-center mb-12">{data.title}</h4>
      <div className="bg-white rounded-2xl border border-border-subtle overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-surface-container-low">
              {data.headers.map((header, index) => (
                <th
                  className={`p-6 font-label-md border-b border-border-subtle ${
                    index === 0 ? '' : 'text-center'
                  } ${index === data.headers.length - 1 ? 'text-secondary' : ''}`}
                  key={header}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {data.rows.map((row) => (
              <tr key={row[0]}>
                <td className="p-6 font-body-md text-on-surface">{row[0]}</td>
                {row.slice(1).map((value, index) => (
                  <td className="p-6 text-center" key={`${row[0]}-${value}-${index}`}>
                    <ComparisonCell isPro={index === data.headers.length - 2} value={value} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
