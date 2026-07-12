import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HERO_SCENE_MS, HERO_TRANSITION_MS, heroSceneDefs } from '@/content';

export function HeroScreenshotShowcase() {
  const { t, i18n } = useTranslation('marketing');
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'show' | 'leave'>('show');
  const [motionOk, setMotionOk] = useState(true);

  const heroScenes = useMemo(
    () =>
      heroSceneDefs.map((def) => ({
        id: def.id,
        image: def.image,
        label: t(`scene${def.key}Tab`),
        caption: t(`scene${def.key}Caption`),
        alt: t(`scene${def.key}Alt`),
      })),
    [t, i18n.language],
  );

  const scene = heroScenes[index]!;
  const base = import.meta.env.BASE_URL;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setMotionOk(!mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!motionOk) {
      return;
    }

    let swapTimer: ReturnType<typeof setTimeout> | undefined;
    const loopTimer = setInterval(() => {
      setPhase('leave');
      swapTimer = setTimeout(() => {
        setIndex((current) => (current + 1) % heroScenes.length);
        setPhase('show');
      }, HERO_TRANSITION_MS);
    }, HERO_SCENE_MS);

    return () => {
      clearInterval(loopTimer);
      if (swapTimer) {
        clearTimeout(swapTimer);
      }
    };
  }, [motionOk, heroScenes.length]);

  return (
    <div className="hero-showcase">
      <div className="hero-showcase__glow" />

      <div className={`hero-showcase__frame hero-showcase__frame--${phase}`}>
        <div className="hero-showcase__chrome">
          <div className="hero-showcase__dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="hero-showcase__brand">
            <img src={`${base}icon-48.png`} width={18} height={18} alt="" />
            <span>Breadcrumb</span>
          </div>
        </div>

        <div className="hero-showcase__viewport" key={scene.id}>
          <img
            className="hero-showcase__shot"
            src={`${base}${scene.image}`}
            alt={scene.alt}
            width={720}
            height={450}
            loading="lazy"
          />
        </div>

        <div className="hero-showcase__footer">
          <p className="hero-showcase__caption" aria-live="polite">
            {scene.caption}
          </p>
          <div className="hero-showcase__steps" role="tablist" aria-label="Product tour">
            {heroScenes.map((item, i) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                className={`hero-showcase__step ${
                  i === index ? 'hero-showcase__step--active' : ''
                }`}
                aria-selected={i === index}
                onClick={() => {
                  setPhase('leave');
                  window.setTimeout(() => {
                    setIndex(i);
                    setPhase('show');
                  }, HERO_TRANSITION_MS);
                }}
              >
                <span className="hero-showcase__step-dot" aria-hidden="true" />
                <span className="hero-showcase__step-label">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
