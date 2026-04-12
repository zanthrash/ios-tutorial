import { Link } from 'react-router-dom';
import type { Phase } from '../../shared/types';

interface SidebarProps {
  phases: Phase[];
}

export default function Sidebar({ phases }: SidebarProps) {
  return (
    <nav aria-label="Tutorial navigation">
      <ul style={{ listStyle: 'none', padding: '0.5rem', margin: 0 }}>
        {phases.map((phase) => (
          <li key={phase.id} style={{ marginBottom: '0.75rem' }}>
            <strong style={{ fontSize: '0.9rem' }}>
              Phase {phase.number}: {phase.title}
            </strong>
            <ul style={{ listStyle: 'none', paddingLeft: '0.75rem', marginTop: '0.25rem' }}>
              {phase.weeks.map((week) => (
                <li key={week.id} style={{ marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#555' }}>
                    Week {week.number}: {week.title}
                  </span>
                  <ul style={{ listStyle: 'none', paddingLeft: '0.75rem', marginTop: '0.15rem' }}>
                    {week.days.map((day) => {
                      const daySlug = day.id.split('/').pop()!;
                      const to = `/phase/${phase.id}/week/${week.number}/day/${daySlug}`;
                      return (
                        <li key={day.id} style={{ marginBottom: '0.1rem' }}>
                          <Link
                            to={to}
                            style={{ fontSize: '0.8rem', textDecoration: 'none', color: '#0066cc' }}
                          >
                            {day.heading}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </nav>
  );
}
