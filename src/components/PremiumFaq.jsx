import { useState } from 'react'
import { MaterialIcon } from './MaterialIcon'

export function PremiumFaq({ data }) {
  const [openItem, setOpenItem] = useState(null)

  return (
    <section className="mt-24 max-w-3xl mx-auto">
      <h4 className="font-headline-md text-headline-md text-center mb-10">{data.title}</h4>
      <div className="space-y-4">
        {data.items.map((item) => {
          const isOpen = openItem === item.question

          return (
            <article
              className="bg-white rounded-xl border border-border-subtle p-6 cursor-pointer hover:border-secondary transition-colors"
              key={item.question}
            >
              <button
                className="flex w-full items-center justify-between bg-transparent border-0 text-left"
                onClick={() => setOpenItem(isOpen ? null : item.question)}
                type="button"
              >
                <h5 className="font-label-md">{item.question}</h5>
                <MaterialIcon name="expand_more" />
              </button>
              {isOpen && (
                <p className="mt-4 text-on-surface-variant font-body-md">{item.answer}</p>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
