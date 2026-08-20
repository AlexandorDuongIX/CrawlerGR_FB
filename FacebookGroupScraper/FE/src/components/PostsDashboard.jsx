import { useState, useEffect, useCallback } from 'react'
import { fetchPosts, fetchGroups } from '../api'

export default function PostsDashboard() {
  const [posts, setPosts] = useState([])
  const [groups, setGroups] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [groupFilter, setGroupFilter] = useState('')
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadPosts = useCallback(async () => {
    setLoading(true)
    const data = await fetchPosts(page, perPage, groupFilter || null, search || null)
    if (data) {
      setPosts(data.posts || [])
      setTotal(data.total || 0)
      setTotalPages(data.total_pages || 0)
    }
    setLoading(false)
  }, [page, perPage, groupFilter, search])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  useEffect(() => {
    const loadGroups = async () => {
      const data = await fetchGroups()
      if (data) setGroups(data.groups || [])
    }
    loadGroups()
  }, [])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchInput])

  const timeAgo = (isoStr) => {
    const diff = Date.now() - new Date(isoStr).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'NOW'
    if (minutes < 60) return `${minutes}M AGO`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}H AGO`
    const days = Math.floor(hours / 24)
    return `${days}D AGO`
  }

  const startItem = total > 0 ? (page - 1) * perPage + 1 : 0
  const endItem = Math.min(page * perPage, total)

  const getPageNumbers = () => {
    const pages = []
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (page > 3) pages.push('...')
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i)
      }
      if (page < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  const activeGroups = groups.filter((g) => g.active)

  return (
    <div className="flex flex-col w-full px-gutter pb-gutter gap-stack-lg relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary-container/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary-container/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header & Filters */}
      <section className="relative z-10 flex flex-col gap-stack-md mt-stack-md">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-stack-md">
          <div className="flex flex-col gap-1">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight uppercase">
              Signal <span className="text-primary font-light">Feed</span>
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-status-running animate-pulse" />
              Live monitoring active across {activeGroups.length} groups
            </p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-surface-glass backdrop-blur-xl p-4 rounded-2xl shadow-lg relative overflow-hidden group/search-bar">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover/search-bar:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <div className="flex flex-col md:flex-row gap-4 relative z-10">
            {/* Search Input */}
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search caption, author, or keyword..."
                className="w-full bg-[#0F172A] text-on-surface font-body-md text-body-md pl-12 pr-4 py-3 rounded-xl border-none focus:ring-1 focus:ring-primary focus:shadow-[0_0_15px_rgba(0,240,255,0.15)] transition-all placeholder:text-on-surface-variant/50 outline-none"
              />
            </div>
            {/* Group Selector */}
            <div className="relative w-full md:w-64 shrink-0">
              <select
                value={groupFilter}
                onChange={(e) => {
                  setGroupFilter(e.target.value)
                  setPage(1)
                }}
                className="w-full bg-[#0F172A] text-on-surface font-label-bold text-label-bold pl-4 pr-10 py-3 rounded-xl border-none focus:ring-1 focus:ring-primary focus:shadow-[0_0_15px_rgba(0,240,255,0.15)] transition-all appearance-none outline-none cursor-pointer"
              >
                <option value="">ALL GROUPS ({activeGroups.length})</option>
                {activeGroups.map((g) => (
                  <option key={g.id} value={g.url}>
                    {g.name || g.url.split('/').pop()}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] pointer-events-none">expand_more</span>
            </div>
            {/* Per Page */}
            <div className="relative w-full md:w-32 shrink-0">
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value))
                  setPage(1)
                }}
                className="w-full bg-[#0F172A] text-on-surface font-label-bold text-label-bold pl-4 pr-10 py-3 rounded-xl border-none focus:ring-1 focus:ring-primary focus:shadow-[0_0_15px_rgba(0,240,255,0.15)] transition-all appearance-none outline-none cursor-pointer text-center"
              >
                <option value="20">20 / PG</option>
                <option value="50">50 / PG</option>
                <option value="100">100 / PG</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] pointer-events-none">expand_more</span>
            </div>
          </div>
        </div>
      </section>

      {/* Card Grid */}
      <section className="relative z-10 w-full flex-1 flex flex-col">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-center h-64">
            <span className="material-symbols-outlined text-[48px] text-primary animate-spin mb-4">progress_activity</span>
            <p className="font-body-md text-body-md text-on-surface-variant">Loading signals...</p>
          </div>
        ) : posts.length > 0 ? (
          <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-surface-glass backdrop-blur-md rounded-2xl p-5 flex flex-col gap-4 shadow-md relative overflow-hidden group/card hover:-translate-y-1 transition-transform duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity" />

                {/* Card Header: Group + Time */}
                <div className="flex justify-between items-start relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#0F172A] flex items-center justify-center shadow-inner">
                      <span className="material-symbols-outlined text-[16px] text-tertiary-fixed">group</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-label-bold text-[10px] uppercase text-text-muted tracking-wider truncate">Group</span>
                      <span className="font-label-bold text-label-bold text-on-surface break-words" title={post.group_name}>
                        {post.group_name}
                      </span>
                    </div>
                  </div>
                  <div className="bg-[#0F172A] px-2 py-1 rounded-md flex items-center gap-1 shadow-inner shrink-0">
                    <span className="material-symbols-outlined text-[12px] text-primary">schedule</span>
                    <span className="font-label-bold text-[10px] text-primary">{timeAgo(post.scraped_at)}</span>
                  </div>
                </div>

                {/* Card Body: Author + Caption */}
                <div className="flex flex-col gap-2 relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-surface-container-high overflow-hidden shadow-inner flex items-center justify-center shrink-0">
                      <span className="font-label-bold text-label-bold text-primary">
                        {post.author?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                    <span className="font-label-bold text-label-sm text-on-surface-variant truncate">{post.author}</span>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface leading-relaxed whitespace-pre-wrap">{post.caption}</p>
                </div>

                {/* Card Action */}
                <div className="mt-4 pt-4 border-t border-white/5 relative z-10 flex justify-end">
                  <a
                    href={post.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-6 py-2 rounded-xl bg-transparent hover:bg-primary/5 text-primary font-label-bold text-label-bold transition-colors group/btn shadow-[inset_0_0_0_1px_rgba(0,240,255,0.3)] hover:shadow-[inset_0_0_0_1px_rgba(0,240,255,0.8),0_0_15px_rgba(0,240,255,0.15)]"
                  >
                    VIEW ON FB
                    <span className="material-symbols-outlined text-[16px] group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center h-64">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 mb-4">inbox</span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface">No Signals Yet</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-sm">
              Start the bot and add groups to begin receiving signals.
            </p>
          </div>
        )}
      </section>

      {/* Pagination */}
      {total > 0 && (
        <footer className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 mt-auto pt-stack-md">
          <div className="flex items-center gap-2 font-label-bold text-label-bold text-text-muted uppercase tracking-widest">
            <span className="text-on-surface">{startItem}</span> - <span className="text-on-surface">{endItem}</span> OF{' '}
            <span className="text-primary">{total.toLocaleString()}</span> SIGNALS
          </div>
          <div className="flex items-center gap-1 bg-[#0F172A] p-1 rounded-xl shadow-inner">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <div className="flex items-center gap-1 px-2">
              {getPageNumbers().map((p, i) =>
                p === '...' ? (
                  <span key={`dots-${i}`} className="w-8 h-8 flex items-center justify-center font-label-bold text-label-bold text-text-muted">
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-label-bold text-label-bold transition-colors ${
                      page === p
                        ? 'bg-primary text-on-primary shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                        : 'text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-on-surface hover:text-primary hover:bg-primary/10 transition-all disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </footer>
      )}
    </div>
  )
}
