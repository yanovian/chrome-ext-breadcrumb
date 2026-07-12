import { useTranslation } from 'react-i18next';
import { Section, SectionHeading } from '@/components/ui';
import { featureDefs } from '@/content';

export function Features() {
  const { t } = useTranslation('marketing');
  const base = import.meta.env.BASE_URL;

  return (
    <Section id="features" tinted>
      <SectionHeading title={t('featuresTitle')} lead={t('featuresLead')} />
      <ul className="feature-grid">
        {featureDefs.map((feature) => (
          <li key={feature.id} className="feature-card">
            <div className="feature-card__media">
              <img
                src={`${base}${feature.image}`}
                alt=""
                width={480}
                height={300}
                loading="lazy"
              />
            </div>
            <div className="feature-card__body">
              <h3>{t(`feature${feature.key}Title`)}</h3>
              <p>{t(`feature${feature.key}Body`)}</p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
