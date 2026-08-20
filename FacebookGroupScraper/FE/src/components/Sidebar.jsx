export default function Sidebar({ activePage, onNavigate }) {
  const navItems = [
    { id: 'posts', label: 'POSTS DASHBOARD', icon: 'dashboard' },
    { id: 'groups', label: 'GROUP MANAGEMENT', icon: 'groups' },
  ]

  return (
    <aside className="fixed left-0 top-0 h-full w-72 bg-surface-container-lowest z-50 flex flex-col border-r border-outline-variant/10 shadow-xl">
      {/* Logo */}
      <div className="p-gutter flex items-center gap-3">
        <img src="/logo.png" alt="NEO-BOT" className="h-8 w-auto object-contain" />
        <span className="font-headline-sm text-headline-sm text-primary-fixed-dim tracking-tight">FB COMMAND</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 mt-stack-lg flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = activePage === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-3 px-4 py-stack-md rounded-xl transition-all group w-full text-left ${
                isActive
                  ? 'bg-secondary-container text-on-secondary-container font-bold shadow-[0_0_15px_rgba(195,244,0,0.2)]'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-label-bold text-label-bold">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* User profile card */}
      <div className="p-6">
        <div className="bg-surface-container-high rounded-xl p-4 flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
          </div>
          <div>
            <p className="text-label-sm font-label-sm text-on-surface">Master Operator</p>
            <p className="text-[10px] text-on-surface-variant uppercase">Premium Access</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
