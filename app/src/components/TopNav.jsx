import React from 'react';
import { NavLink } from 'react-router-dom';

export default function TopNav() {
    return (
        <nav className="fixed top-0 left-0 right-0 h-[60px] bg-charcoal px-8 flex justify-between items-center z-50">
            {/* Logo */}
            <div className="font-serif text-[20px] font-light tracking-[0.2em] text-cream">
                VEIL
            </div>

            {/* Right Nav Links */}
            <ul className="flex items-center gap-6">
                <li>
                    <NavLink
                        to="/home"
                        className={({ isActive }) => `text-[13px] tracking-widest ${isActive ? 'text-accent font-medium' : 'text-muted'}`}
                    >
                        首頁
                    </NavLink>
                </li>
                <li>
                    <NavLink
                        to="/explore"
                        className={({ isActive }) => `text-[13px] tracking-widest ${isActive ? 'text-accent font-medium' : 'text-muted'}`}
                    >
                        探索
                    </NavLink>
                </li>
                <li>
                    <NavLink
                        to="/zones"
                        className={({ isActive }) => `text-[13px] tracking-widest ${isActive ? 'text-accent font-medium' : 'text-muted'}`}
                    >
                        私藏
                    </NavLink>
                </li>
                <li>
                    <NavLink
                        to="/chat"
                        className={({ isActive }) => `text-[16px] ${isActive ? 'text-accent' : 'text-muted'}`}
                    >
                        💬
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/profile/me">
                        <div className="w-8 h-8 rounded-full bg-accent hover:opacity-80 transition-opacity cursor-pointer"></div>
                    </NavLink>
                </li>
            </ul>
        </nav>
    );
}
