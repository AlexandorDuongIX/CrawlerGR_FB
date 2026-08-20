import { useState, useEffect } from 'react'
import { fetchGroups, addGroup, activateGroup, deactivateGroup, deleteGroup } from '../api'

export default function GroupManagement() {
  const [groups, setGroups] = useState([])
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [submitState, setSubmitState] = useState('idle') // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('')
  const [filter, setFilter] = useState('')

  const loadGroups = async () => {
    const data = await fetchGroups()
    if (data) setGroups(data.groups || [])
  }

  useEffect(() => { loadGroups() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitState('loading')
    setErrorMsg('')
    try {
      await addGroup(url, name)
      setSubmitState('success')
      setUrl('')
      setName('')
      loadGroups()
      setTimeout(() => setSubmitState('idle'), 2000)
    } catch (err) {
      setSubmitState('error')
      setErrorMsg(err.message || 'Lỗi khi thêm nhóm')
      setTimeout(() => setSubmitState('idle'), 3000)
    }
  }

  const handleDeactivate = async (id) => {
    await deactivateGroup(id)
    loadGroups()
  }

  const handleActivate = async (id) => {
    await activateGroup(id)
    loadGroups()
  }

  const handleDelete = async (id) => {
    if (window.confirm('Xóa nhóm vĩnh viễn? Hành động này không thể hoàn tác.')) {
      await deleteGroup(id)
      loadGroups()
    }
  }

  const activeCount = groups.filter((g) => g.active).length

  const filteredGroups = groups.filter((g) => {
    if (!filter) return true
    const lower = filter.toLowerCase()
    return (
      (g.name || '').toLowerCase().includes(lower) ||
      g.url.toLowerCase().includes(lower) ||
      String(g.id).includes(lower)
    )
  })

  const formatDate = (isoStr) => {
    const d = new Date(isoStr)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const shortenUrl = (u) => u.replace('https://www.facebook.com', '').replace('https://facebook.com', '')

  return (
    <div className="flex flex-col w-full px-gutter pb-gutter gap-stack-lg relative overflow-hidden">
      {/* Ambient Background Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none transform -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary-fixed/5 rounded-full blur-[80px] pointer-events-none transform translate-y-1/2 -translate-x-1/3" />

      {/* Header Section */}
      <div className="flex flex-col gap-stack-sm pt-stack-md z-10">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>dataset</span>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight uppercase">Group Management</h1>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
          Configure and monitor target environments. Groups added here will be synchronized with the master crawler configuration upon the next active session.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-gutter z-10">
        {/* ──── Left Panel: Add Target Form ──── */}
        <div className="col-span-12 xl:col-span-4 flex flex-col gap-stack-md">
          {/* Form Card */}
          <div className="bg-surface-glass backdrop-blur-xl rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col gap-6" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between relative z-10">
              <h2 className="font-headline-sm text-headline-sm text-on-surface uppercase tracking-wide">Add Target</h2>
              <span className="material-symbols-outlined text-on-surface-variant/50 text-[20px]">add_link</span>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5 relative z-10">
              {/* URL Input */}
              <div className="flex flex-col gap-2 relative group">
                <label htmlFor="groupUrl" className="font-label-bold text-label-bold text-text-muted uppercase tracking-widest flex items-center justify-between">
                  Target URL
                  <span className="text-status-stopped text-[10px]">*REQ</span>
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 text-on-surface-variant/50 group-focus-within:text-primary transition-colors text-[18px]">link</span>
                  <input
                    id="groupUrl"
                    type="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://facebook.com/groups/..."
                    className="w-full bg-[#0F172A] text-on-surface font-body-md text-body-md rounded-xl py-3 pl-12 pr-4 outline-none transition-all duration-300 placeholder-on-surface-variant/30 focus:shadow-[0_0_15px_rgba(0,240,255,0.15)] shadow-inner"
                    style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </div>
              </div>

              {/* Name Input */}
              <div className="flex flex-col gap-2 relative group">
                <label htmlFor="groupName" className="font-label-bold text-label-bold text-text-muted uppercase tracking-widest flex items-center justify-between">
                  Alias <span className="normal-case tracking-normal opacity-50">(Optional)</span>
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 text-on-surface-variant/50 group-focus-within:text-primary transition-colors text-[18px]">badge</span>
                  <input
                    id="groupName"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Chợ PC Gaming Đà Nẵng"
                    className="w-full bg-[#0F172A] text-on-surface font-body-md text-body-md rounded-xl py-3 pl-12 pr-4 outline-none transition-all duration-300 placeholder-on-surface-variant/30 focus:shadow-[0_0_15px_rgba(0,240,255,0.15)] shadow-inner"
                    style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                </div>
              </div>

              {/* Error Message */}
              {submitState === 'error' && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-error-container/20 text-error text-label-sm font-label-sm">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {errorMsg}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitState === 'loading'}
                className={`mt-2 w-full font-label-bold text-label-bold uppercase py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden group/btn shadow-[inset_0_1px_rgba(255,255,255,0.4)] ${
                  submitState === 'success'
                    ? 'bg-status-running text-white'
                    : submitState === 'error'
                    ? 'bg-status-stopped text-white'
                    : 'bg-primary text-on-primary hover:shadow-[0_0_20px_rgba(0,240,255,0.3)]'
                } ${submitState === 'loading' ? 'opacity-80 pointer-events-none' : ''}`}
              >
                {submitState === 'loading' && (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                    <span className="tracking-widest">Processing...</span>
                  </>
                )}
                {submitState === 'success' && (
                  <>
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    <span className="tracking-widest">Injected</span>
                  </>
                )}
                {submitState === 'error' && (
                  <>
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    <span className="tracking-widest">Failed</span>
                  </>
                )}
                {submitState === 'idle' && (
                  <>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-out" />
                    <span className="material-symbols-outlined relative z-10 text-[18px]">add_circle</span>
                    <span className="relative z-10 tracking-widest">Inject Target</span>
                  </>
                )}
              </button>
            </form>

            {/* Decorative Telemetry Visualization */}
            <div className="h-24 mt-2 relative rounded-xl overflow-hidden bg-[#0F172A]" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
              <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0,50 Q25,20 50,50 T100,50" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary animate-pulse" />
                <path d="M0,70 Q35,40 60,70 T100,70" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-secondary-fixed opacity-50" />
              </svg>
              <div className="absolute bottom-2 left-2 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-status-running animate-ping" />
                <span className="font-label-bold text-[8px] text-text-muted uppercase tracking-widest">Telemetry Ready</span>
              </div>
            </div>
          </div>

          {/* Quick Stats Card */}
          <div className="bg-surface-glass backdrop-blur-xl rounded-2xl p-6 shadow-xl flex justify-between items-center" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex flex-col">
              <span className="font-label-bold text-[10px] text-text-muted uppercase tracking-widest">Active Pool</span>
              <span className="font-headline-lg text-headline-lg text-secondary-fixed">{activeCount}</span>
            </div>
            <div className="h-10 w-[1px] bg-white/10" />
            <div className="flex flex-col text-right">
              <span className="font-label-bold text-[10px] text-text-muted uppercase tracking-widest">Total Indexed</span>
              <span className="font-headline-lg text-headline-lg text-on-surface">{groups.length.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* ──── Right Panel: Group Table ──── */}
        <div className="col-span-12 xl:col-span-8 flex flex-col">
          <div className="bg-surface-glass backdrop-blur-xl rounded-2xl shadow-xl flex-1 flex flex-col overflow-hidden relative" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
            {/* Table Header Actions */}
            <div className="p-6 pb-4 flex items-center justify-between bg-surface-container/50 relative z-10" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-on-surface-variant text-[20px]">view_list</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface uppercase tracking-wide">Monitored Environments</h2>
              </div>
              <div className="flex items-center gap-2 bg-[#0F172A] rounded-lg px-3 py-1.5 shadow-inner" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                <span className="material-symbols-outlined text-on-surface-variant text-[16px]">search</span>
                <input
                  type="text"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filter ID/Name..."
                  className="bg-transparent border-none outline-none text-on-surface font-body-md text-label-sm w-32 placeholder-on-surface-variant/50"
                />
              </div>
            </div>

            {/* The Table */}
            <div className="overflow-x-auto relative z-10 flex-1">
              {filteredGroups.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0F172A]/50 text-text-muted font-label-bold text-label-bold uppercase tracking-widest">
                      <th className="py-4 px-6 font-medium w-16">ID</th>
                      <th className="py-4 px-6 font-medium">Alias / Name</th>
                      <th className="py-4 px-6 font-medium hidden lg:table-cell">Target URL</th>
                      <th className="py-4 px-6 font-medium hidden md:table-cell">Injected</th>
                      <th className="py-4 px-6 font-medium">Status</th>
                      <th className="py-4 px-6 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="font-body-md text-body-md text-on-surface">
                    {filteredGroups.map((group) => (
                      <tr
                        key={group.id}
                        className={`hover:bg-white/[0.02] transition-colors group/row ${!group.active ? 'opacity-60 hover:opacity-100' : ''}`}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                      >
                        <td className="py-4 px-6 text-on-surface-variant font-mono text-label-sm">
                          #{String(group.id).padStart(3, '0')}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                group.active ? 'bg-surface-container' : 'bg-[#0F172A]'
                              }`}
                              style={!group.active ? { border: '1px dashed rgba(255,255,255,0.1)' } : {}}
                            >
                              <span className={`material-symbols-outlined text-[16px] ${group.active ? 'text-primary' : 'text-on-surface-variant/50'}`}>
                                {group.active ? 'hub' : 'link_off'}
                              </span>
                            </div>
                            <span
                              className={`font-medium truncate max-w-[150px] sm:max-w-[200px] ${!group.active ? 'text-on-surface-variant line-through' : ''}`}
                              title={group.name || group.url}
                            >
                              {group.name || 'Unnamed'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-on-surface-variant/70 font-mono text-[11px] hidden lg:table-cell truncate max-w-[180px]" title={group.url}>
                          {shortenUrl(group.url)}
                        </td>
                        <td className="py-4 px-6 text-on-surface-variant hidden md:table-cell text-label-sm">
                          {formatDate(group.added_at)}
                        </td>
                        <td className="py-4 px-6">
                          {group.active ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-status-running/10" style={{ border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                              <div className="w-1.5 h-1.5 rounded-full bg-status-running" />
                              <span className="font-label-bold text-[10px] text-status-running uppercase tracking-wider">Active</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-container" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                              <div className="w-1.5 h-1.5 rounded-full bg-text-muted" />
                              <span className="font-label-bold text-[10px] text-text-muted uppercase tracking-wider">Paused</span>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                            {group.active ? (
                              <button
                                onClick={() => handleDeactivate(group.id)}
                                className="p-2 rounded-lg bg-surface-container text-on-surface hover:text-tertiary-fixed transition-colors"
                                title="Deactivate"
                              >
                                <span className="material-symbols-outlined text-[18px]">pause</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActivate(group.id)}
                                className="p-2 rounded-lg bg-surface-container text-on-surface hover:text-status-running transition-colors"
                                title="Activate"
                              >
                                <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(group.id)}
                              className="p-2 rounded-lg bg-surface-container text-on-surface hover:text-status-stopped transition-colors"
                              title="Delete permanently"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center h-64 relative z-10">
                  <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 mb-4">search_off</span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">No Environments Found</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-sm">
                    Add a new target group using the panel on the left to begin monitoring.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
