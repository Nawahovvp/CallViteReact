import React, { useState, useEffect, useRef } from 'react';

export default function AppHeader({ user, onLogout, lastUpdated }) {
    const [showQuickSettings, setShowQuickSettings] = useState(false);
    const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
    const popoverRef = useRef(null);
    const buttonRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(event.target) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target)
            ) {
                setShowQuickSettings(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [popoverRef, buttonRef]);

    const handleLogout = () => {
        localStorage.removeItem('user');
        onLogout();
    };

    return (
        <header className="app-header">
            <div className="brand-block">
                <div className="brand-logo">SP</div>
                <div className="brand-text">
                    <div className="brand-title">รายการอะไหล่ Call ค้างคลังสินค้า Sparepare</div>
                    <div className="brand-meta" style={{ display: lastUpdated ? 'block' : 'none' }}>
                        Data Update: <span>{lastUpdated || '-'}</span>
                    </div>
                </div>
            </div>
            <div className="header-actions">
                <div id="syncProgressText" style={{ fontSize: '11px', color: '#ced4da', marginRight: '5px', display: 'none', whiteSpace: 'nowrap' }}></div>
                <div id="syncStatus" className="sync-status" title="สถานะการซิงค์ข้อมูล"></div>
                <button
                    ref={buttonRef}
                    id="quickSettingButton"
                    className="header-button"
                    onClick={() => setShowQuickSettings(!showQuickSettings)}
                >
                    <i className="fas fa-cog"></i><span>Setting</span>
                </button>

                {showQuickSettings && (
                    <div ref={popoverRef} id="quickSettingPopover" className="quick-setting-popover show">
                        <div className="sheet-header">
                            <div className="sheet-title">โปรไฟล์</div>
                            <button className="sheet-close" onClick={() => setShowQuickSettings(false)}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="sheet-user">
                            <div className="sheet-avatar">
                                {user?.Name ? user.Name.replace(/^(นาย|นางสาว|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.)\s*/, '').charAt(0) : 'U'}
                            </div>
                            <div className="name">{user?.Name || '-'}</div>
                            <div className="meta">
                                <span className="sheet-badge"><i className="fas fa-id-badge" style={{ marginRight: '6px' }}></i>{user?.IDRec || '-'}</span>
                                <span style={{ marginTop: '6px' }}>หน่วยงาน: {user?.['หน่วยงาน'] || '-'} • ทีม: {user?.Unit || '-'} • Plant {user?.Plant || '-'}</span>
                            </div>
                        </div>
                        <div className="sheet-actions">
                            <button className="header-button ghost" onClick={() => { }}>
                                <i className="fas fa-adjust"></i><span>ธีม</span>
                            </button>
                            <button className="header-button danger" onClick={handleLogout}>
                                <i className="fas fa-sign-out-alt"></i><span>ออกจากระบบ</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
