// Stub admin module pages
export function AdminCalendar() {
    return (
        <div>
            <div className="admin-page-header"><h1>Booking Calendar</h1><p>View bookings in calendar format</p></div>
            <div className="admin-card"><p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>Calendar view - Navigate to <strong>Bookings</strong> for list view.</p></div>
        </div>
    );
}

export function AdminContent() {
    return (
        <div>
            <div className="admin-page-header"><h1>Content Management</h1><p>Manage website content and media</p></div>
            <div className="admin-card"><p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>Content management features available here.</p></div>
        </div>
    );
}

export function AdminReports() {
    return (
        <div>
            <div className="admin-page-header"><h1>Reports</h1><p>Generate and view analytical reports</p></div>
            <div className="admin-card"><p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>Report generation features available here.</p></div>
        </div>
    );
}

export function AdminSettings() {
    return (
        <div>
            <div className="admin-page-header"><h1>Settings</h1><p>Manage system configuration</p></div>
            <div className="admin-card"><p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>System settings available here.</p></div>
        </div>
    );
}
