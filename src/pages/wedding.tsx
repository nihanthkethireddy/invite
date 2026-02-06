import { Cinzel, Manrope } from "next/font/google";
import { useEffect, useRef, useState } from "react";
import bride from "../../public/bride.jpg";
import groom from "../../public/groom.jpg";
import haldi from "../../public/haldi.jpg";

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

const slides = [
  {
    id: "bride",
    label: "Bride",
    image: bride.src,
  },
  {
    id: "groom",
    label: "Groom",
    image: groom.src,
  },
  {
    id: "haldi",
    label: "Haldi",
    image: haldi.src,
  },
];

export default function WeddingPage() {
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const [animatedSections, setAnimatedSections] = useState<number[]>([]);
  const timelineRef = useRef<HTMLElement | null>(null);
  const animatedRef = useRef<Set<number>>(new Set());

  const [nameInput, setNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [rsvpChoice, setRsvpChoice] = useState<"yes" | "no" | "maybe" | null>(
    null
  );
  const [plusOnes, setPlusOnes] = useState(0);
  const [savingRsvp, setSavingRsvp] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) {
      return;
    }

    const resetToTop = () => {
      timeline.scrollTop = 0;
    };

    resetToTop();
    window.requestAnimationFrame(resetToTop);
  }, []);

  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) {
      return;
    }

    const enableSnap = () => {
      setSnapEnabled(true);
    };

    timeline.addEventListener("wheel", enableSnap, { passive: true, once: true });
    timeline.addEventListener("touchmove", enableSnap, {
      passive: true,
      once: true,
    });
    window.addEventListener(
      "keydown",
      () => {
        enableSnap();
      },
      { once: true }
    );

    return () => {
      timeline.removeEventListener("wheel", enableSnap);
      timeline.removeEventListener("touchmove", enableSnap);
      window.removeEventListener("keydown", enableSnap);
    };
  }, []);

  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) {
      return;
    }

    const sections = Array.from(
      timeline.querySelectorAll<HTMLElement>("[data-wedding-section]")
    );

    const updateActive = () => {
      const viewCenter = timeline.scrollTop + timeline.clientHeight * 0.5;
      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      sections.forEach((section, index) => {
        const sectionCenter = section.offsetTop + section.offsetHeight / 2;
        const distance = Math.abs(sectionCenter - viewCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      setActiveSection(closestIndex);

      if (!animatedRef.current.has(closestIndex)) {
        animatedRef.current.add(closestIndex);
        window.setTimeout(() => {
          setAnimatedSections((prev) =>
            prev.includes(closestIndex)
              ? prev
              : [...prev, closestIndex].sort((a, b) => a - b)
          );
        }, 2000);
      }
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) {
        return;
      }
      ticking = true;
      window.requestAnimationFrame(() => {
        updateActive();
        ticking = false;
      });
    };

    updateActive();
    timeline.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      timeline.removeEventListener("scroll", onScroll);
    };
  }, []);

  const saveRsvp = async (choice: "yes" | "no" | "maybe", nextPlusOnes: number) => {
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
          scope: "wedding",
        }),
      });

      const data = (await res.json()) as { guest?: unknown; error?: string };
      if (!res.ok || !data.guest) {
        setStatusMessage(data.error ?? "Could not save RSVP");
        return;
      }

      setStatusMessage("RSVP saved. You can change it any time.");
    } catch {
      setStatusMessage("Could not save RSVP. Try again.");
    } finally {
      setSavingRsvp(false);
    }
  };

  const handleSelectRsvp = (choice: "yes" | "no" | "maybe") => {
    const nextPlusOnes = choice === "no" ? 0 : plusOnes;
    setRsvpChoice(choice);
    setPlusOnes(nextPlusOnes);
  };

  const handlePlusOnes = (delta: number) => {
    const nextValue = Math.max(0, Math.min(10, plusOnes + delta));
    setPlusOnes(nextValue);
  };

  const handleSubmitRsvp = () => {
    if (!rsvpChoice) {
      setStatusMessage("Please choose an RSVP option first.");
      return;
    }
    void saveRsvp(rsvpChoice, plusOnes);
  };

  return (
    <div className={`${displayFont.variable} ${bodyFont.variable} wedding-page`}>
      <div className="wedding-slider" aria-hidden="true">
        <div className="wedding-track">
          {slides.concat(slides).map((slide, index) => (
            <div
              key={`${slide.id}-${index}`}
              className="wedding-slide"
              style={{ backgroundImage: `url(${slide.image})` }}
            >
              <div className="wedding-overlay" />
            </div>
          ))}
        </div>
      </div>

      <main
        ref={timelineRef}
        className={`timeline ${snapEnabled ? "snap-enabled" : "snap-disabled"}`}
      >
        <section
          className={`hero-section ${activeSection === 0 ? "is-active" : ""} ${animatedSections.includes(0) ? "animated" : ""}`}
          data-wedding-section
        >
          <p className="eyebrow">Wedding</p>
          <h1 className="hero-title">Bride & Groom</h1>
          <p className="sub">
            The wedding day is here. Scroll to see the sacred moment and share
            your RSVP.
          </p>
          {/* <div className="wedding-tags">
            {slides.map((slide) => (
              <span key={slide.id}>{slide.label}</span>
            ))}
          </div> */}
        </section>

        <section
          className={`event-section event-center ${activeSection === 1 ? "is-active visible" : ""} ${animatedSections.includes(1) ? "animated visible" : ""}`}
          data-wedding-section
        >
          <article className="event-copy">
            <p className="event-count">Wedding</p>
            <h2 className="event-title">The Sacred Moment</h2>
            <p className="event-subtitle">Vows · Blessings · Forever</p>
            <p className="event-details">
              With full hearts, we invite you to witness the union and celebrate
              the beginning of our journey.
            </p>
            <p className="event-visual">
              March 07 | 10:05 AM
              <br/><a href='https://maps.app.goo.gl/gD2yziGvTH6FqWCE9'>DREAM RANCH</a>
            </p>
          </article>
        </section>

        <section
          className="rsvp-section"
          data-wedding-section
        >
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
              {(["yes", "no", "maybe"] as const).map((choice) => (
                <button
                  key={choice}
                  type="button"
                  className={`rsvp-option ${rsvpChoice === choice ? "active" : ""}`}
                  onClick={() => handleSelectRsvp(choice)}
                  disabled={savingRsvp}
                >
                  {choice === "yes" ? "Yes!" : choice === "no" ? "Will Miss It" : "Hopefully"}
                </button>
              ))}
            </div>

            <div className="plusones-row">
              <div className="plusones">
                <p>Additional guests</p>
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
              <button
                type="button"
                className="rsvp-submit rsvp-submit--inline"
                onClick={handleSubmitRsvp}
                disabled={savingRsvp}
              >
                Submit
              </button>
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
