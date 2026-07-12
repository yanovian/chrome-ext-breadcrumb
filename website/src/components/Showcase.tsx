import { useTranslation } from 'react-i18next';
import { Section } from '@/components/ui';
import { topicDefs } from '@/content';

export function Showcase() {
  const { t } = useTranslation('marketing');
  const base = import.meta.env.BASE_URL;

  return (
    <Section id="search">
      <div className="showcase">
        <div className="showcase__copy">
          <p className="eyebrow">{t('showcaseEyebrow')}</p>
          <h2>{t('showcaseTitle')}</h2>
          <p>{t('showcaseBody')}</p>
          <ul className="topic-pills" aria-label="Example topics">
            {topicDefs.map((topic) => (
              <li key={topic.key} className={`topic-pill topic-pill--${topic.tone}`}>
                {t(`topic${topic.key}`)}
              </li>
            ))}
          </ul>
        </div>
        <div className="showcase__frame">
          <img
            className="showcase__shot"
            src={`${base}screenshots/screenshot-2.jpg`}
            alt={t('sceneSearchAlt')}
            width={720}
            height={450}
            loading="lazy"
          />
          <div className="showcase__caption">{t('showcaseCaption')}</div>
        </div>
      </div>
    </Section>
  );
}
