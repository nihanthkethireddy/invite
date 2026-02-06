import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from "react";

type RsvpChoice = "yes" | "no" | "maybe";

type Guest = {
  id: string;
  name: string;
  phone: string;
  rsvp: RsvpChoice | null;
  plusOnes: number;
  scope: "all" | "wedding";
  updatedAt: string;
};

const emptyForm = {
  name: "",
  phone: "",
  rsvp: "" as "" | RsvpChoice,
  plusOnes: 0,
  scope: "all" as "all" | "wedding",
};

export default function AdminPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [filterScope, setFilterScope] = useState<"all" | "wedding" | "any">(
    "any"
  );
  const [filterRsvp, setFilterRsvp] = useState<"all" | RsvpChoice>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<
    "name" | "phone" | "rsvp" | "plusOnes" | "scope" | "updatedAt"
  >("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const reloadGuests = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/guests");
    const data = (await res.json()) as { guests: Guest[]; error?: string };

    if (!res.ok) {
      setMessage(data.error ?? "Failed to load guests");
      setLoading(false);
      return;
    }

    setGuests(data.guests);
    setLoading(false);
  };

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "auto";

    let mounted = true;

    const initialLoad = async () => {
      const res = await fetch("/api/admin/guests");
      const data = (await res.json()) as { guests: Guest[]; error?: string };

      if (!mounted) {
        return;
      }

      if (!res.ok) {
        setMessage(data.error ?? "Failed to load guests");
        setLoading(false);
        return;
      }

      setGuests(data.guests);
      setLoading(false);
    };

    void initialLoad();

    return () => {
      mounted = false;
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const addGuest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    const res = await fetch("/api/admin/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        phone: form.phone,
        rsvp: form.rsvp || null,
        plusOnes: form.plusOnes,
        scope: form.scope,
      }),
    });

    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setMessage(data.error ?? "Failed to save guest");
      return;
    }

    setForm(emptyForm);
    setMessage("Guest saved.");
    await reloadGuests();
  };

  const deleteGuest = async (id: string) => {
    const res = await fetch(`/api/admin/guests/${id}`, { method: "DELETE" });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setMessage(data.error ?? "Failed to delete guest");
      return;
    }

    setMessage("Guest deleted.");
    await reloadGuests();
  };

  const filteredGuests = guests.filter((guest) => {
    const scopeMatch = filterScope === "any" ? true : guest.scope === filterScope;
    const rsvpMatch = filterRsvp === "all" ? true : guest.rsvp === filterRsvp;
    const searchMatch = search
      ? `${guest.name} ${guest.phone}`.toLowerCase().includes(search.toLowerCase())
      : true;
    return scopeMatch && rsvpMatch && searchMatch;
  });

  const sortedGuests = useMemo(() => {
    const sorted = [...filteredGuests].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (sortKey === "updatedAt") {
        return (
          (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * dir
        );
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return (aVal - bVal) * dir;
      }

      return String(aVal ?? "")
        .localeCompare(String(bVal ?? ""), undefined, { sensitivity: "base" }) * dir;
    });

    return sorted;
  }, [filteredGuests, sortDir, sortKey]);

  const toggleSort = (
    nextKey: "name" | "phone" | "rsvp" | "plusOnes" | "scope" | "updatedAt"
  ) => {
    if (sortKey === nextKey) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDir("asc");
  };

  const summarize = (scope: "all" | "wedding") => {
    const scoped = guests.filter((guest) => guest.scope === scope);
    const yes = scoped.filter((guest) => guest.rsvp === "yes");
    const no = scoped.filter((guest) => guest.rsvp === "no");
    const maybe = scoped.filter((guest) => guest.rsvp === "maybe");
    const totalRsvps = scoped.filter((guest) => guest.rsvp !== null).length;
    const totalPeople = yes.reduce((sum, guest) => sum + 1 + guest.plusOnes, 0);

    return {
      yes: yes.length,
      no: no.length,
      maybe: maybe.length,
      totalRsvps,
      totalPeople,
      totalGuests: scoped.length,
    };
  };

  const allSummary = summarize("all");
  const weddingSummary = summarize("wedding");

  const percent = (value: number, total: number) =>
    total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <main className="admin-page admin-scroll">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">Analytics Dashboard</p>
          <h1>RSVP Insights</h1>
          <p>Track attendance, filter guests, and manage RSVPs.</p>
        </div>
        <div className="admin-header-actions">
          <button type="button" className="admin-btn" onClick={reloadGuests}>
            Refresh
          </button>
        </div>
      </header>

      <section className="admin-metrics">
        <div className="admin-card">
          <h3>All Events</h3>
          <div className="metric-grid">
            <div>
              <span>Total Guests</span>
              <strong>{allSummary.totalGuests}</strong>
            </div>
            <div>
              <span>Total RSVPs</span>
              <strong>{allSummary.totalRsvps}</strong>
            </div>
            <div>
              <span>Attendees</span>
              <strong>{allSummary.totalPeople}</strong>
            </div>
          </div>
          <div className="chart-stack">
            <div className="chart-row">
              <span>Coming</span>
              <div className="bar"><span style={{ width: `${percent(allSummary.yes, allSummary.totalRsvps)}%` }} /></div>
              <strong>{allSummary.yes}</strong>
            </div>
            <div className="chart-row">
              <span>Tentative</span>
              <div className="bar bar-maybe"><span style={{ width: `${percent(allSummary.maybe, allSummary.totalRsvps)}%` }} /></div>
              <strong>{allSummary.maybe}</strong>
            </div>
            <div className="chart-row">
              <span>Not Coming</span>
              <div className="bar bar-no"><span style={{ width: `${percent(allSummary.no, allSummary.totalRsvps)}%` }} /></div>
              <strong>{allSummary.no}</strong>
            </div>
          </div>
        </div>

        <div className="admin-card">
          <h3>Wedding Only</h3>
          <div className="metric-grid">
            <div>
              <span>Total Guests</span>
              <strong>{weddingSummary.totalGuests}</strong>
            </div>
            <div>
              <span>Total RSVPs</span>
              <strong>{weddingSummary.totalRsvps}</strong>
            </div>
            <div>
              <span>Attendees</span>
              <strong>{weddingSummary.totalPeople}</strong>
            </div>
          </div>
          <div className="chart-stack">
            <div className="chart-row">
              <span>Coming</span>
              <div className="bar"><span style={{ width: `${percent(weddingSummary.yes, weddingSummary.totalRsvps)}%` }} /></div>
              <strong>{weddingSummary.yes}</strong>
            </div>
            <div className="chart-row">
              <span>Tentative</span>
              <div className="bar bar-maybe"><span style={{ width: `${percent(weddingSummary.maybe, weddingSummary.totalRsvps)}%` }} /></div>
              <strong>{weddingSummary.maybe}</strong>
            </div>
            <div className="chart-row">
              <span>Not Coming</span>
              <div className="bar bar-no"><span style={{ width: `${percent(weddingSummary.no, weddingSummary.totalRsvps)}%` }} /></div>
              <strong>{weddingSummary.no}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="admin-filters">
        <input
          placeholder="Search by name or phone"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          value={filterScope}
          onChange={(event) =>
            setFilterScope(event.target.value as "all" | "wedding" | "any")
          }
        >
          <option value="any">All scopes</option>
          <option value="all">All events</option>
          <option value="wedding">Wedding</option>
        </select>
        <select
          value={filterRsvp}
          onChange={(event) =>
            setFilterRsvp(event.target.value as "all" | RsvpChoice)
          }
        >
          <option value="all">All RSVP</option>
          <option value="yes">Coming</option>
          <option value="maybe">Tentative</option>
          <option value="no">Not coming</option>
        </select>
      </section>

      <form
        onSubmit={addGuest}
        className="admin-form"
      >
        <input
          required
          placeholder="Name"
          value={form.name}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, name: event.target.value }))
          }
        />
        <input
          required
          placeholder="Phone"
          value={form.phone}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, phone: event.target.value }))
          }
        />
        <select
          value={form.rsvp}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              rsvp: event.target.value as "" | RsvpChoice,
            }))
          }
        >
          <option value="">No response</option>
          <option value="yes">Yes</option>
          <option value="maybe">Maybe</option>
          <option value="no">No</option>
        </select>
        <input
          type="number"
          min={0}
          max={10}
          value={form.plusOnes}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              plusOnes: Number(event.target.value),
            }))
          }
        />
        <select
          value={form.scope}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              scope: event.target.value as "all" | "wedding",
            }))
          }
        >
          <option value="all">All events</option>
          <option value="wedding">Wedding</option>
        </select>
        <button type="submit" className="admin-btn">
          Add / Update
        </button>
      </form>

      {message ? <p className="admin-message">{message}</p> : null}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
          <thead>
            <tr>
              <th style={cellStyle}>
                <button type="button" className="sort-btn" onClick={() => toggleSort("name")}>
                  Name
                </button>
              </th>
              <th style={cellStyle}>
                <button type="button" className="sort-btn" onClick={() => toggleSort("phone")}>
                  Phone
                </button>
              </th>
              <th style={cellStyle}>
                <button type="button" className="sort-btn" onClick={() => toggleSort("rsvp")}>
                  RSVP
                </button>
              </th>
              <th style={cellStyle}>
                <button type="button" className="sort-btn" onClick={() => toggleSort("plusOnes")}>
                  +1
                </button>
              </th>
              <th style={cellStyle}>
                <button type="button" className="sort-btn" onClick={() => toggleSort("scope")}>
                  Scope
                </button>
              </th>
              <th style={cellStyle}>
                <button type="button" className="sort-btn" onClick={() => toggleSort("updatedAt")}>
                  Updated
                </button>
              </th>
              <th style={cellStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedGuests.map((guest) => (
              <tr key={guest.id}>
                <td style={cellStyle}>{guest.name}</td>
                <td style={cellStyle}>{guest.phone}</td>
                <td style={cellStyle}>
                  <span className={`badge badge-${guest.rsvp ?? "none"}`}>
                    {guest.rsvp ?? "No response"}
                  </span>
                </td>
                <td style={cellStyle}>{guest.plusOnes}</td>
                <td style={cellStyle}>
                  <span className="badge badge-scope">{guest.scope}</span>
                </td>
                <td style={cellStyle}>{new Date(guest.updatedAt).toLocaleString()}</td>
                <td style={cellStyle}>
                  <button
                    type="button"
                    className="admin-btn admin-btn--ghost"
                    onClick={() => deleteGuest(guest.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {sortedGuests.length === 0 ? (
              <tr>
                <td style={cellStyle} colSpan={7}>
                  No guests yet.
                </td>
              </tr>
            ) : null}
          </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

const cellStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.14)",
  padding: "0.5rem",
  textAlign: "left",
};
