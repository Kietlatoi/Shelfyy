import { MaterialIcon } from "./MaterialIcon";

function WardrobeItemCard({ item }) {
  return (
    <article className="bg-white rounded-2xl border border-border-subtle overflow-hidden flex flex-col group">
      <div className="aspect-[3/4] bg-surface-container relative overflow-hidden">
        <div
          className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
          style={{ backgroundImage: `url("${item.image}")` }}
        />
        <button className="absolute top-3 right-3 w-8 h-8 bg-white/80 backdrop-blur rounded-full flex items-center justify-center text-on-surface-variant hover:text-secondary transition-colors">
          <MaterialIcon name="favorite" className="text-[18px]" />
        </button>
      </div>
      <div className="p-3">
        <p className="text-[10px] font-bold text-secondary uppercase">
          {item.brand}
        </p>
        <h4 className="text-sm font-semibold truncate">{item.name}</h4>
        <p className="text-[10px] text-on-surface-variant mt-1">{item.meta}</p>
      </div>
    </article>
  );
}

export function WardrobeGrid({ collection, filters, items, onAddClick }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-8">
        <div className="flex gap-6">
          {filters.map((filter) => (
            <button
              className={
                filter.active
                  ? "font-label-md text-primary border-b-2 border-primary pb-2"
                  : "font-label-md text-on-surface-variant hover:text-primary pb-2 transition-colors"
              }
              key={filter.label}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 text-sm text-on-surface-variant border border-border-subtle px-3 py-1.5 rounded-lg bg-white">
            <MaterialIcon name="filter_list" className="text-lg" />
            Lọc
          </button>
          <button className="flex items-center gap-2 text-sm text-on-surface-variant border border-border-subtle px-3 py-1.5 rounded-lg bg-white">
            <MaterialIcon name="sort" className="text-lg" />
            Sắp xếp
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        <article className="col-span-2 row-span-2 bg-white rounded-2xl border border-border-subtle overflow-hidden flex flex-col">
          <div className="flex-1 relative group overflow-hidden">
            <img
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              src={collection.image}
              alt={collection.title}
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary shadow-lg hover:bg-secondary hover:text-white transition-colors">
                <MaterialIcon name="favorite" />
              </button>
              <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-primary shadow-lg hover:bg-secondary hover:text-white transition-colors">
                <MaterialIcon name="edit" />
              </button>
            </div>
          </div>
          <div className="p-4 bg-white">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-label-md text-primary">
                  {collection.title}
                </h3>
                <p className="text-xs text-on-surface-variant">
                  {collection.count}
                </p>
              </div>
              <span className="text-xs font-bold text-secondary">
                {collection.status}
              </span>
            </div>
          </div>
        </article>

        {items.map((item) => (
          <WardrobeItemCard item={item} key={item.name} />
        ))}

        <button
          onClick={onAddClick}
          className="bg-dashed-border border-2 border-dashed border-border-subtle rounded-2xl flex flex-col items-center justify-center gap-3 p-6 text-on-surface-variant hover:border-secondary hover:text-secondary transition-all cursor-pointer group min-h-[180px]"
        >
          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center group-hover:bg-secondary-fixed transition-colors">
            <MaterialIcon name="add" />
          </div>
          <p className="text-xs font-bold">Thêm món đồ</p>
        </button>
      </div>
    </section>
  );
}
