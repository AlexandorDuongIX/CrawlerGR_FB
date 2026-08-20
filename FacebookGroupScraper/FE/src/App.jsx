import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import PostsDashboard from './components/PostsDashboard'
import GroupManagement from './components/GroupManagement'

export default function App() {
  const [activePage, setActivePage] = useState('posts')

  return (
    <>
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <div className="pl-72">
        <Header />
        <main className="relative pt-20 bg-surface min-h-screen">
          {activePage === 'posts' && <PostsDashboard />}
          {activePage === 'groups' && <GroupManagement />}
        </main>
      </div>
    </>
  )
}
