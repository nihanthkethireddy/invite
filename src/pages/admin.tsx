import { type CSSProperties, type FormEvent, useEffect, useState } from "react";

type RsvpChoice = "yes" | "no" | "maybe";

type Guest = {
  id: string;
  name: string;
  phone: string;
  rsvp: RsvpChoice | null;
  plusOnes: number;
  updatedAt: string;
};

const emptyForm = {
  name: "",
  phone: "",
  rsvp: "" as "" | RsvpChoice,
  plusOnes: 0,
};

export default function AdminPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

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
    if (!res.ok) {
      setMessage("Failed to delete guest");
      return;
    }

    setMessage("Guest deleted.");
    await reloadGuests();
  };

  return (
    <main style={{ padding: "1.5rem", maxWidth: 980, margin: "0 auto" }}>
      <h1>Admin RSVP Dashboard</h1>
      <p>Review all RSVP responses, add guests manually, and delete records.</p>

      <form
        onSubmit={addGuest}
        style={{
          display: "grid",
          gap: "0.6rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          marginTop: "1rem",
          marginBottom: "1.4rem",
        }}
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
        <button type="submit">Add / Update</button>
      </form>

      {message ? <p>{message}</p> : null}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <thead>
            <tr>
              <th style={cellStyle}>Name</th>
              <th style={cellStyle}>Phone</th>
              <th style={cellStyle}>RSVP</th>
              <th style={cellStyle}>+1</th>
              <th style={cellStyle}>Updated</th>
              <th style={cellStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {guests.map((guest) => (
              <tr key={guest.id}>
                <td style={cellStyle}>{guest.name}</td>
                <td style={cellStyle}>{guest.phone}</td>
                <td style={cellStyle}>{guest.rsvp ?? "-"}</td>
                <td style={cellStyle}>{guest.plusOnes}</td>
                <td style={cellStyle}>{new Date(guest.updatedAt).toLocaleString()}</td>
                <td style={cellStyle}>
                  <button type="button" onClick={() => deleteGuest(guest.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {guests.length === 0 ? (
              <tr>
                <td style={cellStyle} colSpan={6}>
                  No guests yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      )}
    </main>
  );
}

const cellStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.14)",
  padding: "0.5rem",
  textAlign: "left",
};
