import { Cinzel, Manrope } from "next/font/google";
import bride from "../../public/bride.jpg";
import groom from "../../public/groom.jpg";
import sangeeth from "../../public/sangeeth.jpeg";
import haldi from "../../public/haldi.jpg";
import wedding from "../../public/wedding.png";
import {
  type CSSProperties,
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
  no: "Will Miss It",
  maybe: "Hopefully",
};

const events: EventItem[] = [
  {
    id: "haldi",
    name: "Haldi",
    subtitle: "March 05 | 8:00 AM<br/><a href='https://maps.app.goo.gl/y1AsV6Sv8YDu9wnr8'>BLISS</a>",
    details:
      "The celebrations begin with the vibrant Haldi ceremony, filled with laughter, love, and golden hues of joy.",
    visualHint:
     "Dress Code<br/>Color Theme: Yellow<br/>Women: Sheraras, Kurtis, Kalis, or Lehengas<br/>Men: Kurtha with Pajamas",
    palette: "#f7bf1d",
    focus: "50% 35%",
    align: "left",
    image: haldi.src,
  },
  {
    id: "pellikuthuru",
    name: "Pellikuthuru",
    subtitle: "March 06 | 9:00 AM<br/><a href='https://maps.app.goo.gl/y1AsV6Sv8YDu9wnr8'>BLISS</a>",
    details:
      "A sacred and beautiful tradition filled with blessings, rituals, and heartfelt emotions as the bride is prepared for her new journey.",
    visualHint: "Dress Code<br/>Traditional Attire",
    palette: "#c4466d",
    focus: "52% 22%",
    align: "left",
    image: bride.src,
  },
  {
    id: "pellikoduku",
    name: "Pellikoduku",
    subtitle: "March 06 | 9:00 AM<br/><a href='https://maps.app.goo.gl/y1AsV6Sv8YDu9wnr8'>BLISS</a>",
    details:
      "A joyful and sacred ritual celebrating the groom as he prepares to step into a new chapter of life.",
    visualHint: "Dress Code<br/>Traditional Attire",
    palette: "#8f3f58",
    focus: "48% 20%",
    align: "right",
    image: groom.src,
  },
  {
    id: "mehendi/sangeeth",
    name: "Mehendi/Sangeeth",
    subtitle: "March 05 | 6:30 PM<br/><a href='https://maps.app.goo.gl/y1AsV6Sv8YDu9wnr8'>BLISS</a>",
    details:
      "An evening of music, dance, colors, and celebration. Let’s sing, dance, and celebrate love together as hands are adorned with mehendi and hearts with happiness.",
    visualHint: "Dress Code<br/>Anything Shimmery & Festive",
    palette: "#5336bf",
    focus: "50% 36%",
    align: "left",
    image: sangeeth.src,
  },
  {
    id: "wedding",
    name: "Wedding",
    subtitle: "March 07 | 10:05 AM<br/><a href='https://maps.app.goo.gl/gD2yziGvTH6FqWCE9'>DREAM RANCH</a>",
    details: "The most awaited moment, where two hearts unite and promise forever in the presence of family, love, and divine blessings. Join us as we begin our forever together.",
    visualHint:
      "Dress Code<br/>Traditional Attire",
    palette: "#9f2444",
    focus: "50% 26%",
    align: "center",
    image: wedding.src,
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

export default function Home() {
  const [activeScene, setActiveScene] = useState(0);
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [visible, setVisible] = useState<number[]>([]);
  const [animatedSections, setAnimatedSections] = useState<number[]>([]);
  const [heroAnimated, setHeroAnimated] = useState(false);
  const inviteRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<HTMLElement | null>(null);
  const animatedRef = useRef<Set<number>>(new Set());
  const heroAnimatedRef = useRef(false);

  const [nameInput, setNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [rsvpChoice, setRsvpChoice] = useState<RsvpChoice | null>(null);
  const [plusOnes, setPlusOnes] = useState(0);

  const [savingRsvp, setSavingRsvp] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

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

          if (!animatedRef.current.has(index)) {
            animatedRef.current.add(index);
            window.setTimeout(() => {
              setAnimatedSections((prev) =>
                prev.includes(index) ? prev : [...prev, index].sort((a, b) => a - b)
              );
            }, 2000);
          }
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

      if (closestScene === 0 && !heroAnimatedRef.current) {
        heroAnimatedRef.current = true;
        window.setTimeout(() => setHeroAnimated(true), 2000);
      }

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

  const applyGuest = (nextGuest: Guest) => {
    setRsvpChoice(nextGuest.rsvp);
    setPlusOnes(nextGuest.plusOnes);
  };

  const saveRsvp = async (choice: RsvpChoice, nextPlusOnes: number) => {
    const trimmedName = nameInput.trim();
    const trimmedPhone = phoneInput.trim();
    if (!trimmedName || !trimmedPhone) {
      setStatusMessage("Please enter your name and phone number before RSVP.");
      return;
    }

    setSavingRsvp(true);
    setStatusMessage("");

    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          phone: trimmedPhone,
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
        <span className="spark spark-d" />
        <span className="spark spark-e" />
        <span className="spark spark-f" />
        <span className="spark spark-g" />
        <span className="spark spark-h" />
        <span className="spark spark-i" />
      </div>

      <main
        ref={timelineRef}
        className={`timeline ${snapEnabled ? "snap-enabled" : "snap-disabled"}`}
      >
        <section
          className={`hero-section ${activeScene === 0 ? "is-active" : ""} ${heroAnimated ? "animated" : ""}`}
          data-scene-section
          data-scene-index={0}
          data-snap-section
        >
          <p className="eyebrow">Wedding Invitation</p>
          <h1 className="hero-title">Bride & Groom</h1>
          <p className="sub">
            With joyful hearts and endless gratitude, we invite you to celebrate one of the most beautiful chapters of our lives. This wedding is not just the union of two souls, but the coming together of families, laughter, traditions, and love that will last a lifetime.
          </p>
          <p className="hero-note">Your presence means the world to us.</p>
        </section>

        {events.map((event, index) => (
          <section
            key={event.id}
            data-event-section
            data-scene-section
            data-snap-section
            data-index={index}
            data-scene-index={index + 1}
            className={`event-section event-${event.align} ${event.id === "wedding" ? "is-finale" : ""} ${visible.includes(index) ? "visible" : ""} ${animatedSections.includes(index) ? "animated" : ""} ${activeScene === index + 1 ? "is-active" : ""}`}
          >
            <article className="event-copy">
              <p className="event-count">
                {String(index + 1).padStart(2, "0")} / {String(events.length).padStart(2, "0")}
              </p>
              <h2 className="event-title">{event.name}</h2>
              <p
                className="event-subtitle"
                dangerouslySetInnerHTML={{ __html: event.subtitle }}
              />
              <p className="event-details">{event.details}</p>
              <p
                className="event-visual"
                dangerouslySetInnerHTML={{ __html: event.visualHint }}
              />
              {event.id === "wedding" && (
                <div className="finale-invite">
                  <p>With full hearts and our families by our side,</p>
                  <p>
                    we warmly invite you to witness our wedding and bless our
                    journey.
                  </p>
                  <p className="event-meta">Formal invite details to follow</p>
                </div>
              )}
            </article>
          </section>
        ))}

        <section className="rsvp-section" data-snap-section>
          <div className="rsvp-shell">
            <p className="eyebrow">RSVP</p>
            <h4>Your presence at our wedding means more to us than words can express. As we prepare for these beautiful celebrations, we kindly request you to let us know your availability so we can make the arrangements comfortable and memorable for everyone.</h4>
            <p className="rsvp-intro">
              Kindly respond at your convenience
            </p>

            <div className="rsvp-identity">
              <label className="rsvp-field">
                <span>Name</span>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(event) => setNameInput(event.target.value)}
                  placeholder="Enter your full name"
                  autoComplete="name"
                />
              </label>
              <label className="rsvp-field">
                <span>Phone Number</span>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(event) => setPhoneInput(event.target.value)}
                  placeholder="Enter your phone number"
                  autoComplete="tel"
                />
              </label>
            </div>

            <div className="rsvp-options">
              {(["yes", "no", "maybe"] as RsvpChoice[]).map((choice) => (
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
              We look forward to sharing these precious moments with you and celebrating together with love, laughter, and joy.
            </p>
            {statusMessage ? <p className="status-msg">{statusMessage}</p> : null}
          </div>
        </section>
      </main>
    </div>
  );
}
