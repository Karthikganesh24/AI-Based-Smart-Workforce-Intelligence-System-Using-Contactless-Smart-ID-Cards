import { useState, useMemo, useCallback } from 'react';
import { Card, Badge, Button, Input, Modal, Spinner } from '@components/UI';
import { AnimatedNumber } from '@components/Animations';
import {
  useActiveEvacuation,
  useEvacuationHeadcount,
  useZoneSummary,
  useAuditTrail,
  useStartEvacuation,
  useCloseEvacuation,
  useVerifyPerson,
  useStartSimulation,
} from '@hooks/useEmergency';
import type { EvacuationParticipant, HeadcountStatus } from '@models/emergency';
import { BuildingMap } from '@components/Emergency/BuildingMap';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import './Emergency.css';

type TabId = 'dashboard' | 'people' | 'zones' | 'audit';

const STATUS_CONFIG: Record<
  HeadcountStatus,
  { label: string; cssClass: string; badgeVariant: 'success' | 'error' | 'warning' | 'default' }
> = {
  ACCOUNTED_FOR: { label: 'Accounted for', cssClass: 'status-accounted', badgeVariant: 'success' },
  MISSING: { label: 'Missing', cssClass: 'status-missing', badgeVariant: 'error' },
  UNVERIFIED: { label: 'Unverified', cssClass: 'status-unverified', badgeVariant: 'warning' },
  NOT_EXPECTED: { label: 'Not expected', cssClass: 'status-not-expected', badgeVariant: 'default' },
};

function formatElapsed(isoString: string | null): string {
  if (!isoString) return 'Unknown';
  try {
    return formatDistanceToNow(new Date(isoString), { addSuffix: true });
  } catch {
    return isoString;
  }
}

function formatTime(isoString: string | null): string {
  if (!isoString) return '--';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoString;
  }
}

export const Emergency = () => {
  const [tab, setTab] = useState<TabId>('dashboard');
  const [showStartModal, setShowStartModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState<EvacuationParticipant | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<HeadcountStatus | 'ALL'>('ALL');
  const [zoneFilter, setZoneFilter] = useState('ALL');

  const { data: activeData, isLoading: activeLoading } = useActiveEvacuation();
  const evacuation = activeData?.evacuation ?? null;
  const evacId = evacuation?.id ?? null;

  const { data: headcountData } = useEvacuationHeadcount(evacId);
  const { data: zoneSummary } = useZoneSummary(evacId);
  const { data: auditData } = useAuditTrail(evacId);

  const stats = headcountData?.stats ?? activeData?.stats ?? null;
  const headcount = headcountData?.headcount ?? [];

  const startMutation = useStartEvacuation();
  const closeMutation = useCloseEvacuation();
  const verifyMutation = useVerifyPerson(evacId ?? '');
  const simulationMutation = useStartSimulation();

  const uniqueZones = useMemo(() => {
    const zones = new Set<string>();
    headcount.forEach((p) => {
      if (p.lastKnownZone) zones.add(p.lastKnownZone);
    });
    return Array.from(zones).sort();
  }, [headcount]);

  const filteredPeople = useMemo(() => {
    let result = headcount;
    if (statusFilter !== 'ALL') {
      result = result.filter((p) => p.headcountStatus === statusFilter);
    }
    if (zoneFilter !== 'ALL') {
      if (zoneFilter === 'UNAVAILABLE') {
        result = result.filter((p) => !p.lastKnownZone);
      } else {
        result = result.filter((p) => p.lastKnownZone === zoneFilter);
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.empName.toLowerCase().includes(q) ||
          p.empId.toLowerCase().includes(q) ||
          (p.department && p.department.toLowerCase().includes(q))
      );
    }
    return result;
  }, [headcount, statusFilter, zoneFilter, searchQuery]);

  const missingPeople = useMemo(
    () => headcount.filter((p) => p.headcountStatus === 'MISSING'),
    [headcount]
  );

  const handleQuickVerify = useCallback(
    (empId: string, status: HeadcountStatus) => {
      if (!evacId) return;
      verifyMutation.mutate(
        { empId, status, verificationMethod: 'MANUAL' },
        {
          onSuccess: () => {
            const label = status === 'ACCOUNTED_FOR' ? 'accounted for' : 'updated';
            toast.success(`Person marked as ${label}`);
          },
          onError: (err) => toast.error(err instanceof Error ? err.message : 'Verification failed'),
        }
      );
    },
    [evacId, verifyMutation]
  );

  if (activeLoading) {
    return (
      <div className="loading-container">
        <Spinner size="lg" />
        <p>Loading emergency status</p>
      </div>
    );
  }

  // ───── No active evacuation ─────
  if (!evacuation) {
    return (
      <div className="emergency-page">
        <div className="emergency-inactive">
          <Card>
            <div className="inactive-content">
              <div className="inactive-icon" aria-hidden="true">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M24 6L44 42H4L24 6Z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M24 20V28" strokeLinecap="round" />
                  <circle cx="24" cy="34" r="1.5" fill="currentColor" stroke="none" />
                </svg>
              </div>
              <h2>No Active Emergency</h2>
              <p>
                There is no evacuation event in progress. When an emergency occurs, an authorized
                administrator can initiate an evacuation to begin the headcount process.
              </p>
              <div className="inactive-actions">
                <Button
                  variant="error"
                  size="lg"
                  onClick={() => setShowStartModal(true)}
                  className="start-evacuation-btn"
                >
                  Start Evacuation
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  isLoading={simulationMutation.isPending}
                  onClick={() => {
                    simulationMutation.mutate(undefined, {
                      onSuccess: (data) => {
                        toast.success(`Simulation started: ${data.participantCount} employees exiting over ~90 seconds`);
                      },
                      onError: (err) =>
                        toast.error(err instanceof Error ? err.message : 'Failed to start simulation'),
                    });
                  }}
                  className="simulate-btn"
                >
                  Simulate Drill
                </Button>
              </div>
              <p className="simulate-hint">
                Simulate Drill runs a full BLE iBeacon evacuation — employees exit through
                simulated gates over ~90 seconds. Watch the dashboard update in real time.
              </p>
            </div>
          </Card>
        </div>

        <StartEvacuationModal
          isOpen={showStartModal}
          onClose={() => setShowStartModal(false)}
          onStart={(params) => {
            startMutation.mutate(params, {
              onSuccess: () => {
                setShowStartModal(false);
                toast.success('Evacuation started');
              },
              onError: (err) =>
                toast.error(err instanceof Error ? err.message : 'Failed to start evacuation'),
            });
          }}
          isLoading={startMutation.isPending}
        />
      </div>
    );
  }

  // ───── Active evacuation ─────
  const completionPct = stats?.completionPercentage ?? 0;

  return (
    <div className="emergency-page emergency-active-page">
      {/* Emergency status header */}
      <div className="emergency-header" role="banner">
        <div className="emergency-header-left">
          <div className="emergency-pulse" aria-hidden="true" />
          <div>
            <h1 className="emergency-title">{evacuation.eventName}</h1>
            <p className="emergency-meta">
              Started {formatElapsed(evacuation.startedAt)} &middot; Coordinator:{' '}
              {evacuation.coordinatorName}
              {evacuation.building && <> &middot; {evacuation.building}</>}
            </p>
          </div>
        </div>
        <div className="emergency-header-right">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowCloseModal(true)}
          >
            Close Evacuation
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="emergency-stats" role="region" aria-label="Headcount statistics">
        <Card className="stat-card stat-expected">
          <div className="stat-label">Expected</div>
          <div className="stat-value">
            <AnimatedNumber value={stats?.expected ?? 0} />
          </div>
        </Card>
        <Card className="stat-card stat-accounted">
          <div className="stat-label">
            <span className="stat-indicator stat-indicator-green" aria-hidden="true" />
            Accounted for
          </div>
          <div className="stat-value">
            <AnimatedNumber value={stats?.accounted ?? 0} />
          </div>
        </Card>
        <Card className="stat-card stat-missing-card">
          <div className="stat-label">
            <span className="stat-indicator stat-indicator-red" aria-hidden="true" />
            Missing
          </div>
          <div className="stat-value">
            <AnimatedNumber value={stats?.missing ?? 0} />
          </div>
        </Card>
        <Card className="stat-card stat-unverified-card">
          <div className="stat-label">
            <span className="stat-indicator stat-indicator-amber" aria-hidden="true" />
            Unverified
          </div>
          <div className="stat-value">
            <AnimatedNumber value={stats?.unverified ?? 0} />
          </div>
        </Card>
        <Card className="stat-card stat-completion">
          <div className="stat-label">Completion</div>
          <div className="stat-value">{completionPct}%</div>
          <div
            className="completion-bar"
            role="progressbar"
            aria-valuenow={completionPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Headcount ${completionPct}% complete`}
          >
            <div
              className="completion-fill"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="emergency-tabs" role="tablist" aria-label="Emergency sections">
        {(['dashboard', 'people', 'zones', 'audit'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={clsx('emergency-tab', tab === t && 'emergency-tab-active')}
            onClick={() => setTab(t)}
          >
            {t === 'dashboard' && 'Missing Persons'}
            {t === 'people' && 'All People'}
            {t === 'zones' && 'Zone Summary'}
            {t === 'audit' && 'Audit Trail'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="emergency-content" role="tabpanel">
        {tab === 'dashboard' && (
          <>
            <BuildingMap
              participants={headcount}
              zones={zoneSummary ?? []}
              isActive={evacuation.status === 'ACTIVE'}
            />
            <MissingPersonsList
              people={missingPeople}
              onVerify={handleQuickVerify}
              onShowDetail={setShowVerifyModal}
              isVerifying={verifyMutation.isPending}
            />
          </>
        )}

        {tab === 'people' && (
          <AllPeopleList
            people={filteredPeople}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            zoneFilter={zoneFilter}
            onZoneFilterChange={setZoneFilter}
            uniqueZones={uniqueZones}
            onVerify={handleQuickVerify}
            onShowDetail={setShowVerifyModal}
            isVerifying={verifyMutation.isPending}
          />
        )}

        {tab === 'zones' && <ZoneSummaryPanel zones={zoneSummary ?? []} />}

        {tab === 'audit' && <AuditTrailPanel records={auditData ?? []} />}
      </div>

      {/* Modals */}
      <CloseEvacuationModal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        onConfirm={(reason) => {
          closeMutation.mutate(
            { id: evacuation.id, reason },
            {
              onSuccess: () => {
                setShowCloseModal(false);
                toast.success('Evacuation closed');
              },
              onError: (err) =>
                toast.error(err instanceof Error ? err.message : 'Failed to close evacuation'),
            }
          );
        }}
        isLoading={closeMutation.isPending}
        stats={stats}
      />

      {showVerifyModal && (
        <VerifyPersonModal
          person={showVerifyModal}
          onClose={() => setShowVerifyModal(null)}
          onVerify={(params) => {
            verifyMutation.mutate(params, {
              onSuccess: () => {
                setShowVerifyModal(null);
                toast.success('Verification recorded');
              },
              onError: (err) =>
                toast.error(err instanceof Error ? err.message : 'Verification failed'),
            });
          }}
          isLoading={verifyMutation.isPending}
        />
      )}
    </div>
  );
};

// ───── Sub-components ─────

function PersonRow({
  person,
  onVerify,
  onShowDetail,
  isVerifying,
}: {
  person: EvacuationParticipant;
  onVerify: (empId: string, status: HeadcountStatus) => void;
  onShowDetail: (p: EvacuationParticipant) => void;
  isVerifying: boolean;
}) {
  const cfg = STATUS_CONFIG[person.headcountStatus];
  const isStale =
    person.lastDetectedAt &&
    Date.now() - new Date(person.lastDetectedAt).getTime() > 30 * 60 * 1000;

  return (
    <div className={clsx('person-row', cfg.cssClass)}>
      <div className="person-info">
        <div className="person-name">{person.empName}</div>
        <div className="person-details">
          <span className="person-id">{person.empId}</span>
          {person.department && (
            <>
              <span className="detail-sep" aria-hidden="true">&middot;</span>
              <span>{person.department}</span>
            </>
          )}
        </div>
      </div>

      <div className="person-location">
        {person.lastKnownZone ? (
          <>
            <span className="zone-name">{person.lastKnownZone}</span>
            <span className={clsx('last-detected', isStale && 'stale-data')}>
              {formatTime(person.lastDetectedAt)}
              {isStale && <span className="stale-label"> (stale)</span>}
            </span>
          </>
        ) : (
          <span className="no-location">Location unavailable</span>
        )}
      </div>

      <div className="person-status">
        <Badge variant={cfg.badgeVariant} size="sm">
          {cfg.label}
        </Badge>
      </div>

      <div className="person-actions">
        {person.headcountStatus !== 'ACCOUNTED_FOR' && (
          <Button
            variant="success"
            size="sm"
            onClick={() => onVerify(person.empId, 'ACCOUNTED_FOR')}
            disabled={isVerifying}
            aria-label={`Mark ${person.empName} as accounted for`}
          >
            Safe
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onShowDetail(person)}
          aria-label={`More options for ${person.empName}`}
        >
          Details
        </Button>
      </div>
    </div>
  );
}

function MissingPersonsList({
  people,
  onVerify,
  onShowDetail,
  isVerifying,
}: {
  people: EvacuationParticipant[];
  onVerify: (empId: string, status: HeadcountStatus) => void;
  onShowDetail: (p: EvacuationParticipant) => void;
  isVerifying: boolean;
}) {
  if (people.length === 0) {
    return (
      <Card className="empty-state-card">
        <div className="empty-state">
          <h3>All personnel accounted for</h3>
          <p>No missing persons at this time.</p>
        </div>
      </Card>
    );
  }

  const withLocation = people.filter((p) => p.lastKnownZone);
  const withoutLocation = people.filter((p) => !p.lastKnownZone);

  return (
    <div className="missing-list">
      <div className="section-header">
        <h2>
          Missing Persons <span className="count-badge">{people.length}</span>
        </h2>
        <p className="section-subtitle">
          Personnel not yet confirmed safe. Prioritized by available location data.
        </p>
      </div>

      {withoutLocation.length > 0 && (
        <div className="priority-group">
          <h3 className="group-label group-label-critical">
            No location data ({withoutLocation.length})
          </h3>
          {withoutLocation.map((p) => (
            <PersonRow
              key={p.empId}
              person={p}
              onVerify={onVerify}
              onShowDetail={onShowDetail}
              isVerifying={isVerifying}
            />
          ))}
        </div>
      )}

      {withLocation.length > 0 && (
        <div className="priority-group">
          <h3 className="group-label">Last known location available ({withLocation.length})</h3>
          {withLocation.map((p) => (
            <PersonRow
              key={p.empId}
              person={p}
              onVerify={onVerify}
              onShowDetail={onShowDetail}
              isVerifying={isVerifying}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AllPeopleList({
  people,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  zoneFilter,
  onZoneFilterChange,
  uniqueZones,
  onVerify,
  onShowDetail,
  isVerifying,
}: {
  people: EvacuationParticipant[];
  searchQuery: string;
  onSearchChange: (v: string) => void;
  statusFilter: HeadcountStatus | 'ALL';
  onStatusFilterChange: (v: HeadcountStatus | 'ALL') => void;
  zoneFilter: string;
  onZoneFilterChange: (v: string) => void;
  uniqueZones: string[];
  onVerify: (empId: string, status: HeadcountStatus) => void;
  onShowDetail: (p: EvacuationParticipant) => void;
  isVerifying: boolean;
}) {
  return (
    <div className="all-people">
      <div className="filters-bar">
        <Input
          placeholder="Search by name, ID, or department"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="search-input"
          aria-label="Search people"
        />
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as HeadcountStatus | 'ALL')}
          className="filter-select"
          aria-label="Filter by status"
        >
          <option value="ALL">All statuses</option>
          <option value="MISSING">Missing</option>
          <option value="ACCOUNTED_FOR">Accounted for</option>
          <option value="UNVERIFIED">Unverified</option>
          <option value="NOT_EXPECTED">Not expected</option>
        </select>
        <select
          value={zoneFilter}
          onChange={(e) => onZoneFilterChange(e.target.value)}
          className="filter-select"
          aria-label="Filter by zone"
        >
          <option value="ALL">All zones</option>
          <option value="UNAVAILABLE">No location data</option>
          {uniqueZones.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </div>

      <div className="people-count">
        Showing {people.length} {people.length === 1 ? 'person' : 'people'}
      </div>

      {people.length === 0 ? (
        <Card className="empty-state-card">
          <div className="empty-state">
            <h3>No results</h3>
            <p>No people match the current filters.</p>
          </div>
        </Card>
      ) : (
        <div className="people-list">
          {people.map((p) => (
            <PersonRow
              key={p.empId}
              person={p}
              onVerify={onVerify}
              onShowDetail={onShowDetail}
              isVerifying={isVerifying}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ZoneSummaryPanel({ zones }: { zones: Array<{ zone: string; total: number; accounted: number; missing: number; unverified: number; notExpected: number }> }) {
  if (zones.length === 0) {
    return (
      <Card className="empty-state-card">
        <div className="empty-state">
          <h3>No zone data</h3>
          <p>Zone summary will appear once an evacuation is in progress.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="zone-summary">
      <div className="section-header">
        <h2>Zone Summary</h2>
        <p className="section-subtitle">
          Expected, accounted, and unaccounted personnel by last known zone.
        </p>
      </div>
      <div className="zone-grid">
        {zones.map((z) => {
          const expected = z.total - z.notExpected;
          const pct = expected > 0 ? Math.round((z.accounted / expected) * 100) : 0;
          return (
            <Card key={z.zone} className="zone-card">
              <div className="zone-card-header">
                <h3 className="zone-card-name">{z.zone}</h3>
                <span className="zone-card-pct">{pct}%</span>
              </div>
              <div
                className="zone-bar"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${z.zone}: ${pct}% accounted for`}
              >
                <div className="zone-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="zone-card-stats">
                <div className="zone-stat">
                  <span className="zone-stat-value">{expected}</span>
                  <span className="zone-stat-label">Expected</span>
                </div>
                <div className="zone-stat zone-stat-green">
                  <span className="zone-stat-value">{z.accounted}</span>
                  <span className="zone-stat-label">Safe</span>
                </div>
                <div className="zone-stat zone-stat-red">
                  <span className="zone-stat-value">{z.missing}</span>
                  <span className="zone-stat-label">Missing</span>
                </div>
                <div className="zone-stat zone-stat-amber">
                  <span className="zone-stat-value">{z.unverified}</span>
                  <span className="zone-stat-label">Unverified</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function AuditTrailPanel({
  records,
}: {
  records: Array<{
    id: string;
    empId: string;
    empName: string;
    previousStatus: string;
    newStatus: string;
    verificationMethod: string | null;
    verifiedByName: string;
    note: string | null;
    createdAt: string;
  }>;
}) {
  if (records.length === 0) {
    return (
      <Card className="empty-state-card">
        <div className="empty-state">
          <h3>No verification records</h3>
          <p>Audit entries will appear as personnel are verified.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="audit-trail">
      <div className="section-header">
        <h2>Verification Audit Trail</h2>
        <p className="section-subtitle">Chronological record of all headcount status changes.</p>
      </div>
      <div className="audit-list">
        {records.map((r) => {
          const prevCfg = STATUS_CONFIG[r.previousStatus as HeadcountStatus];
          const newCfg = STATUS_CONFIG[r.newStatus as HeadcountStatus];
          return (
            <div key={r.id} className="audit-row">
              <div className="audit-time">{formatTime(r.createdAt)}</div>
              <div className="audit-info">
                <span className="audit-name">{r.empName}</span>
                <span className="audit-id">({r.empId})</span>
                <span className="audit-change">
                  {prevCfg?.label ?? r.previousStatus} &rarr; {newCfg?.label ?? r.newStatus}
                </span>
              </div>
              <div className="audit-meta">
                <span>by {r.verifiedByName}</span>
                {r.verificationMethod && <span> &middot; {r.verificationMethod}</span>}
                {r.note && <span className="audit-note"> &mdash; {r.note}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ───── Modal components ─────

function StartEvacuationModal({
  isOpen,
  onClose,
  onStart,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onStart: (params: { eventName: string; building?: string; notes?: string }) => void;
  isLoading: boolean;
}) {
  const [eventName, setEventName] = useState('');
  const [building, setBuilding] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName.trim()) return;
    onStart({
      eventName: eventName.trim(),
      building: building.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Start Evacuation" size="md">
      <form onSubmit={handleSubmit} className="evac-form">
        <p className="form-warning">
          This will initiate an emergency headcount for all active employees. All personnel will be
          marked as Missing until individually verified.
        </p>
        <Input
          label="Event Name"
          placeholder="e.g. Fire Alarm — Building A"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
          required
          autoFocus
        />
        <Input
          label="Building / Site (optional)"
          placeholder="e.g. Building A"
          value={building}
          onChange={(e) => setBuilding(e.target.value)}
        />
        <div className="input-wrapper">
          <label className="input-label">Notes (optional)</label>
          <textarea
            className="input evac-textarea"
            placeholder="Additional context for this evacuation"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>
        <div className="form-actions">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="error" type="submit" isLoading={isLoading} disabled={!eventName.trim()}>
            Start Evacuation
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CloseEvacuationModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  stats,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isLoading: boolean;
  stats: { missing: number; unverified: number; accounted: number; expected: number } | null;
}) {
  const [reason, setReason] = useState('');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Close Evacuation" size="md">
      <div className="close-form">
        {stats && stats.missing > 0 && (
          <div className="close-warning">
            <strong>{stats.missing} personnel still missing.</strong> Closing this evacuation will
            finalize the headcount record. This action is audited.
          </div>
        )}
        <div className="input-wrapper">
          <label className="input-label">Close Reason (optional)</label>
          <textarea
            className="input evac-textarea"
            placeholder="e.g. All clear — false alarm"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
          />
        </div>
        <div className="form-actions">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            isLoading={isLoading}
            onClick={() => onConfirm(reason.trim())}
          >
            Close Evacuation
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function VerifyPersonModal({
  person,
  onClose,
  onVerify,
  isLoading,
}: {
  person: EvacuationParticipant;
  onClose: () => void;
  onVerify: (params: {
    empId: string;
    status: HeadcountStatus;
    verificationMethod?: string;
    note?: string;
    notExpectedReason?: string;
  }) => void;
  isLoading: boolean;
}) {
  const [method, setMethod] = useState('MANUAL');
  const [note, setNote] = useState('');
  const [notExpectedReason, setNotExpectedReason] = useState('');

  const cfg = STATUS_CONFIG[person.headcountStatus];

  return (
    <Modal isOpen onClose={onClose} title={`Verify — ${person.empName}`} size="md">
      <div className="verify-form">
        <div className="verify-person-summary">
          <div className="verify-field">
            <span className="verify-label">ID</span>
            <span>{person.empId}</span>
          </div>
          <div className="verify-field">
            <span className="verify-label">Department</span>
            <span>{person.department || '--'}</span>
          </div>
          <div className="verify-field">
            <span className="verify-label">Last known zone</span>
            <span>{person.lastKnownZone || 'Location unavailable'}</span>
          </div>
          <div className="verify-field">
            <span className="verify-label">Last detected</span>
            <span>{person.lastDetectedAt ? formatElapsed(person.lastDetectedAt) : '--'}</span>
          </div>
          <div className="verify-field">
            <span className="verify-label">Current status</span>
            <Badge variant={cfg.badgeVariant} size="sm">{cfg.label}</Badge>
          </div>
        </div>

        <div className="input-wrapper">
          <label className="input-label">Verification method</label>
          <select
            className="input filter-select"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option value="MANUAL">Manual (visual/verbal confirmation)</option>
            <option value="BLE_EXIT_GATE">BLE iBeacon exit gate scan</option>
            <option value="BLE_CHECKPOINT">BLE iBeacon checkpoint</option>
            <option value="RADIO">Radio check-in</option>
            <option value="PHONE">Phone call</option>
            <option value="QR_SCAN">QR code scan</option>
          </select>
        </div>

        <div className="input-wrapper">
          <label className="input-label">Note (optional)</label>
          <textarea
            className="input evac-textarea"
            placeholder="Optional note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />
        </div>

        <div className="verify-actions">
          <Button
            variant="success"
            onClick={() =>
              onVerify({
                empId: person.empId,
                status: 'ACCOUNTED_FOR',
                verificationMethod: method,
                note: note.trim() || undefined,
              })
            }
            isLoading={isLoading}
          >
            Mark Safe
          </Button>
          <Button
            variant="error"
            onClick={() =>
              onVerify({
                empId: person.empId,
                status: 'MISSING',
                verificationMethod: method,
                note: note.trim() || undefined,
              })
            }
            isLoading={isLoading}
          >
            Mark Missing
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              onVerify({
                empId: person.empId,
                status: 'UNVERIFIED',
                verificationMethod: method,
                note: note.trim() || undefined,
              })
            }
            isLoading={isLoading}
          >
            Mark Unverified
          </Button>
        </div>

        <details className="not-expected-section">
          <summary>Mark as Not Expected</summary>
          <div className="not-expected-form">
            <Input
              label="Reason"
              placeholder="e.g. On leave, remote worker"
              value={notExpectedReason}
              onChange={(e) => setNotExpectedReason(e.target.value)}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                onVerify({
                  empId: person.empId,
                  status: 'NOT_EXPECTED',
                  verificationMethod: method,
                  note: note.trim() || undefined,
                  notExpectedReason: notExpectedReason.trim() || undefined,
                })
              }
              isLoading={isLoading}
              disabled={!notExpectedReason.trim()}
            >
              Confirm Not Expected
            </Button>
          </div>
        </details>
      </div>
    </Modal>
  );
}
