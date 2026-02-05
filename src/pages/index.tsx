import { Cinzel, Manrope } from "next/font/google";
import {
  type CSSProperties,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

const displayFont = Cinzel({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "700"],
});

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
});

type EventItem = {
  id: string;
  name: string;
  subtitle: string;
  details: string;
  visualHint: string;
  palette: string;
  image: string;
  focus: string;
  align: "left" | "right" | "center";
};

type SceneItem = {
  id: string;
  palette: string;
  image: string;
  focus: string;
};

type RsvpChoice = "yes" | "no" | "maybe";

type Guest = {
  id: string;
  name: string;
  phone: string;
  rsvp: RsvpChoice | null;
  plusOnes: number;
};

const RSVP_LABEL: Record<RsvpChoice, string> = {
  yes: "Yes, with joy",
  no: "Sorry, can't make it",
  maybe: "Maybe",
};

const events: EventItem[] = [
  {
    id: "pellikuthuru",
    name: "Pellikuthuru",
    subtitle: "Bridal Blessing Ceremony",
    details:
      "A gentle morning of blessings and rituals, celebrating the bride's joy.",
    visualHint: "Placeholder visual: close-up of the bride's face.",
    palette: "#c4466d",
    focus: "52% 22%",
    align: "left",
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=2000&q=80",
  },
  {
    id: "pellikoduku",
    name: "Pellikoduku",
    subtitle: "Groom's Traditional Ritual",
    details:
      "Family prayers and sacred rituals that prepare the groom for the wedding day.",
    visualHint: "Placeholder visual: close-up of the groom's face.",
    palette: "#8f3f58",
    focus: "48% 20%",
    align: "right",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=2000&q=80",
  },
  {
    id: "haldi",
    name: "Haldi",
    subtitle: "Sunshine & Turmeric",
    details:
      "Playful haldi moments, yellow laughter, and family splashes all around.",
    visualHint:
      "Placeholder visual: both of them with yellow tones, water play, and family group.",
    palette: "#f7bf1d",
    focus: "50% 35%",
    align: "left",
    image:
      "https://images.unsplash.com/photo-1529634806980-85c3dd6d34ac?auto=format&fit=crop&w=2000&q=80",
  },
  {
    id: "mehendi",
    name: "Mehendi",
    subtitle: "Henna & Smiles",
    details:
      "Hands painted with intricate mehendi patterns while music and laughter fill the evening.",
    visualHint:
      "Placeholder visual: detailed henna close-ups with both of them in frame.",
    palette: "#3e8f5d",
    focus: "50% 30%",
    align: "right",
    image:
      "https://images.unsplash.com/photo-1607457561901-e6ec3a6d16cf?auto=format&fit=crop&w=2000&q=80",
  },
  {
    id: "sangeeth",
    name: "Sangeeth",
    subtitle: "Dance Night",
    details:
      "A high-energy night where both families celebrate through music and dance.",
    visualHint: "Placeholder visual: bride and groom dancing together.",
    palette: "#5336bf",
    focus: "50% 36%",
    align: "left",
    image:
      "https://images.unsplash.com/photo-1516307365426-bea591f05011?auto=format&fit=crop&w=2000&q=80",
  },
  {
    id: "wedding",
    name: "Wedding",
    subtitle: "The Sacred Moment",
    details: "The vows, the blessings, and the moment our new chapter begins.",
    visualHint:
      "Placeholder visual: warm close-up of both during the wedding ritual.",
    palette: "#9f2444",
    focus: "50% 26%",
    align: "center",
    image:
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=2000&q=80",
  },
];

const scenes: SceneItem[] = [
  {
    id: "intro",
    palette: "#78416c",
    focus: "50% 42%",
    image:
      "https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=2000&q=80",
  },
  ...events.map((event) => ({
    id: event.id,
    palette: event.palette,
    image: event.image,
    focus: event.focus,
  })),
];

const STORAGE_KEY = "invite_guest_phone";

export default function Home() {
  const [activeScene, setActiveScene] = useState(0);
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [visible, setVisible] = useState<number[]>([]);
  const inviteRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<HTMLElement | null>(null);

  const [guest, setGuest] = useState<Guest | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [rsvpChoice, setRsvpChoice] = useState<RsvpChoice | null>(null);
  const [plusOnes, setPlusOnes] = useState(0);

  const [showGuestModal, setShowGuestModal] = useState(true);
  const [loadingGuest, setLoadingGuest] = useState(true);
  const [savingRsvp, setSavingRsvp] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) {
      return;
    }

    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    const resetToTop = () => {
      timeline.scrollTop = 0;
    };

    resetToTop();
    window.requestAnimationFrame(resetToTop);

    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) {
      return;
    }

    const enableSnap = () => {
      setSnapEnabled(true);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const keys = ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Space"];
      if (keys.includes(event.code)) {
        enableSnap();
      }
    };

    timeline.addEventListener("wheel", enableSnap, { passive: true, once: true });
    timeline.addEventListener("touchmove", enableSnap, {
      passive: true,
      once: true,
    });
    window.addEventListener("keydown", onKeyDown, { once: true });

    return () => {
      timeline.removeEventListener("wheel", enableSnap);
      timeline.removeEventListener("touchmove", enableSnap);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) {
      return;
    }

    const eventSections = Array.from(
      timeline.querySelectorAll<HTMLElement>("[data-event-section]")
    );
    const sceneSections = Array.from(
      timeline.querySelectorAll<HTMLElement>("[data-scene-section]")
    );

    const visibleObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }
          const index = Number(entry.target.getAttribute("data-index"));
          setVisible((prev) =>
            prev.includes(index) ? prev : [...prev, index].sort((a, b) => a - b)
          );
        });
      },
      { threshold: 0.28, root: timeline }
    );

    eventSections.forEach((section) => visibleObserver.observe(section));

    const updateSceneMotion = () => {
      const viewCenter = timeline.scrollTop + timeline.clientHeight * 0.52;
      let closestScene = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      sceneSections.forEach((section, index) => {
        const sectionCenter = section.offsetTop + section.offsetHeight / 2;
        const distance = Math.abs(sectionCenter - viewCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestScene = index;
        }
      });

      setActiveScene(closestScene);

      const maxScroll = Math.max(1, timeline.scrollHeight - timeline.clientHeight);
      const progress = Math.min(1, Math.max(0, timeline.scrollTop / maxScroll));
      inviteRef.current?.style.setProperty("--active-zoom", `${1.04 + progress * 0.24}`);
      inviteRef.current?.style.setProperty("--world-shift", `${progress * 100}px`);
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) {
        return;
      }
      ticking = true;
      window.requestAnimationFrame(() => {
        updateSceneMotion();
        ticking = false;
      });
    };

    updateSceneMotion();
    timeline.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      visibleObserver.disconnect();
      timeline.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    const restoreGuest = async () => {
      const storedPhone = window.localStorage.getItem(STORAGE_KEY);
      if (!storedPhone) {
        setLoadingGuest(false);
        setShowGuestModal(true);
        return;
      }

      try {
        const res = await fetch(`/api/guest?phone=${encodeURIComponent(storedPhone)}`);
        const data = (await res.json()) as { guest: Guest | null; error?: string };

        if (!res.ok || !data.guest) {
          window.localStorage.removeItem(STORAGE_KEY);
          setLoadingGuest(false);
          setShowGuestModal(true);
          return;
        }

        applyGuest(data.guest);
        setShowGuestModal(false);
      } catch {
        setShowGuestModal(true);
      } finally {
        setLoadingGuest(false);
      }
    };

    void restoreGuest();
  }, []);

  const applyGuest = (nextGuest: Guest) => {
    setGuest(nextGuest);
    setNameInput(nextGuest.name);
    setPhoneInput(nextGuest.phone);
    setRsvpChoice(nextGuest.rsvp);
    setPlusOnes(nextGuest.plusOnes);
    window.localStorage.setItem(STORAGE_KEY, nextGuest.phone);
  };

  const handleIdentitySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    try {
      const res = await fetch("/api/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput, phone: phoneInput }),
      });

      const data = (await res.json()) as { guest?: Guest; error?: string };
      if (!res.ok || !data.guest) {
        setFormError(data.error ?? "Unable to continue");
        return;
      }

      applyGuest(data.guest);
      setShowGuestModal(false);
      setStatusMessage("Welcome! Please choose your RSVP at the end.");
    } catch {
      setFormError("Something went wrong. Try again.");
    }
  };

  const saveRsvp = async (choice: RsvpChoice, nextPlusOnes: number) => {
    if (!guest) {
      setShowGuestModal(true);
      return;
    }

    setSavingRsvp(true);
    setStatusMessage("");

    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: guest.name,
          phone: guest.phone,
          rsvp: choice,
          plusOnes: choice === "no" ? 0 : nextPlusOnes,
        }),
      });

      const data = (await res.json()) as { guest?: Guest; error?: string };
      if (!res.ok || !data.guest) {
        setStatusMessage(data.error ?? "Could not save RSVP");
        return;
      }

      applyGuest(data.guest);
      setStatusMessage("RSVP saved. You can change it any time.");
    } catch {
      setStatusMessage("Could not save RSVP. Try again.");
    } finally {
      setSavingRsvp(false);
    }
  };

  const handleSelectRsvp = (choice: RsvpChoice) => {
    const nextPlusOnes = choice === "no" ? 0 : plusOnes;
    setRsvpChoice(choice);
    setPlusOnes(nextPlusOnes);
    void saveRsvp(choice, nextPlusOnes);
  };

  const handlePlusOnes = (delta: number) => {
    const nextValue = Math.max(0, Math.min(10, plusOnes + delta));
    setPlusOnes(nextValue);

    if (rsvpChoice && rsvpChoice !== "no") {
      void saveRsvp(rsvpChoice, nextValue);
    }
  };

  return (
    <div
      ref={inviteRef}
      className={`${displayFont.variable} ${bodyFont.variable} invite-page`}
      style={
        {
          "--active-zoom": 1.08,
          "--world-shift": "0px",
          "--scene-hue": `${activeScene * 8}deg`,
        } as CSSProperties
      }
    >
      <div className="bg-layer-stack" aria-hidden="true">
        {scenes.map((scene, index) => (
          <div
            key={scene.id}
            data-event-id={scene.id}
            className={`bg-layer ${activeScene === index ? "active" : ""}`}
            style={
              {
                "--event-image": `url(${scene.image})`,
                "--event-color": scene.palette,
                "--event-focus": scene.focus,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className="world-atmosphere" aria-hidden="true">
        <span className="veil veil-a" />
        <span className="veil veil-b" />
        <span className="orb orb-a" />
        <span className="orb orb-b" />
        <span className="orb orb-c" />
        <span className="spark spark-a" />
        <span className="spark spark-b" />
        <span className="spark spark-c" />
      </div>

      {showGuestModal && !loadingGuest ? (
        <div className="guest-modal" role="dialog" aria-modal="true">
          <form className="guest-form" onSubmit={handleIdentitySubmit}>
            <p className="eyebrow">Welcome</p>
            <h2>Before we begin</h2>
            <p>
              Please share your name and phone number. One RSVP is tracked per
              phone number.
            </p>
            <label htmlFor="name">Name</label>
            <input
              id="name"
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              placeholder="Your full name"
              required
            />
            <label htmlFor="phone">Phone Number</label>
            <input
              id="phone"
              value={phoneInput}
              onChange={(event) => setPhoneInput(event.target.value)}
              placeholder="e.g. +1 555 123 4567"
              required
            />
            {formError ? <p className="form-error">{formError}</p> : null}
            <button type="submit">Continue</button>
          </form>
        </div>
      ) : null}

      <main
        ref={timelineRef}
        className={`timeline ${snapEnabled ? "snap-enabled" : "snap-disabled"}`}
      >
        <section className="hero-section" data-scene-section data-scene-index={0} data-snap-section>
          <p className="eyebrow">Wedding Invitation</p>
          <h1>Bride & Groom</h1>
          <p className="sub">
            This page is a journey through our wedding celebrations, from
            pre-wedding rituals to the wedding ceremony itself.
          </p>
          <p className="hero-note">Scroll to experience each event in order.</p>
        </section>

        {events.map((event, index) => (
          <section
            key={event.id}
            data-event-section
            data-scene-section
            data-snap-section
            data-index={index}
            data-scene-index={index + 1}
            className={`event-section event-${event.align} ${event.id === "wedding" ? "is-finale" : ""} ${visible.includes(index) ? "visible" : ""}`}
          >
            <article className="event-copy">
              <p className="event-count">
                {String(index + 1).padStart(2, "0")} / {String(events.length).padStart(2, "0")}
              </p>
              <h2>{event.name}</h2>
              <p className="event-subtitle">{event.subtitle}</p>
              <p className="event-details">{event.details}</p>
              <p className="event-visual">{event.visualHint}</p>
              {event.id === "wedding" ? (
                <div className="finale-invite">
                  <p>With full hearts and our families by our side,</p>
                  <p>
                    we warmly invite you to witness our wedding and bless our
                    journey.
                  </p>
                  <p className="event-meta">Formal invite details to follow</p>
                </div>
              ) : (
                <p className="event-meta">Detailed schedule to be announced</p>
              )}
            </article>
          </section>
        ))}

        <section className="rsvp-section" data-snap-section>
          <div className="rsvp-shell">
            <p className="eyebrow">RSVP</p>
            <h2>Will you celebrate with us?</h2>
            {guest ? (
              <p className="rsvp-intro">
                {guest.rsvp
                  ? `Welcome back, ${guest.name}. Your current response is ${RSVP_LABEL[guest.rsvp]}.`
                  : `Hi ${guest.name}, we would love to know if you can join us.`}
              </p>
            ) : (
              <p className="rsvp-intro">Tell us your response below.</p>
            )}

            <div className="rsvp-options">
              {(["yes", "maybe", "no"] as RsvpChoice[]).map((choice) => (
                <button
                  key={choice}
                  type="button"
                  className={`rsvp-option ${rsvpChoice === choice ? "active" : ""}`}
                  onClick={() => handleSelectRsvp(choice)}
                  disabled={savingRsvp}
                >
                  {RSVP_LABEL[choice]}
                </button>
              ))}
            </div>

            <div className="plusones">
              <p>How many +1 are you bringing?</p>
              <div className="plusones-controls">
                <button
                  type="button"
                  onClick={() => handlePlusOnes(-1)}
                  disabled={savingRsvp || rsvpChoice === "no" || plusOnes <= 0}
                >
                  -
                </button>
                <span>{rsvpChoice === "no" ? 0 : plusOnes}</span>
                <button
                  type="button"
                  onClick={() => handlePlusOnes(1)}
                  disabled={savingRsvp || rsvpChoice === "no" || plusOnes >= 10}
                >
                  +
                </button>
              </div>
            </div>

            <p className="rsvp-note">
              One RSVP per phone number. Selecting a different option updates your
              previous response.
            </p>
            {statusMessage ? <p className="status-msg">{statusMessage}</p> : null}
          </div>
        </section>
      </main>
    </div>
  );
}
