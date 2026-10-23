import { useUIStore } from '@store/uiStore';
import { Button } from '@components/UI';
import { MenuIcon, SunIcon, MoonIcon } from './icons';
import './Header.css';

export const Header = () => {
  const { toggleSidebar, theme, setTheme } = useUIStore();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="header">
      <div className="header-left">
        <Button variant="ghost" size="sm" onClick={toggleSidebar} aria-label="Toggle sidebar">
          <MenuIcon />
        </Button>
        <h2 className="header-title">Admin Dashboard</h2>
      </div>

      <div className="header-right">
        <Button variant="ghost" size="sm" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </Button>
        <div className="header-status">
          <span className="status-indicator status-online" />
          <span className="status-text">System Online</span>
        </div>
      </div>
    </header>
  );
};
