import { NavLink } from 'react-router-dom';
import { useUIStore } from '@store/uiStore';
import clsx from 'clsx';
import {
  HomeIcon,
  BuildingIcon,
  CheckIcon,
  UsersIcon,
  TerminalIcon,
  ChartIcon,
  HistoryIcon,
  UserIcon,
} from './icons';
import './Sidebar.css';

const navigation = [
  { name: 'Overview', path: '/', icon: HomeIcon },
  { name: 'Room Occupancy', path: '/rooms', icon: BuildingIcon },
  { name: 'Attendance', path: '/attendance', icon: CheckIcon },
  { name: 'Employees', path: '/employees', icon: UsersIcon },
  { name: 'Terminal', path: '/terminal', icon: TerminalIcon },
  { name: 'Analytics', path: '/analytics', icon: ChartIcon },
  { name: 'History', path: '/history', icon: HistoryIcon },
];

export const Sidebar = () => {
  const { sidebarOpen } = useUIStore();

  return (
    <aside className={clsx('sidebar', !sidebarOpen && 'sidebar-collapsed')}>
      <div className="sidebar-header">
        <h1 className="sidebar-logo">
          {sidebarOpen && <span className="logo-text">SmartWorkforce</span>}
          {!sidebarOpen && <span className="logo-text-short">SW</span>}
        </h1>
      </div>

      <nav className="sidebar-nav">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                clsx('sidebar-nav-item', isActive && 'sidebar-nav-item-active')
              }
            >
              <span className="nav-item-icon">
                <Icon />
              </span>
              {sidebarOpen && <span className="nav-item-text">{item.name}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="user-avatar">
            <UserIcon />
          </div>
          {sidebarOpen && (
            <div className="user-info">
              <div className="user-name">Admin User</div>
              <div className="user-role">Administrator</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
