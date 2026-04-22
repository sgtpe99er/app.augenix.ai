/**
 * Home page design variants for the 3-design preview system.
 *
 * Each variant returns the full content for src/app/page.tsx in the
 * customer's GitHub repo. All three use siteConfig for data but differ
 * meaningfully in layout, section order, typography weight, and
 * visual treatment.
 */

/**
 * Design 1 — "Dark Hero" (standard)
 * Full-height image hero with centered text and dark overlay.
 * Section order: Hero → Services grid → About (image right) → Gallery → Testimonials → CTA
 */
export const DESIGN_1_PAGE = `import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { IoLocationSharp, IoTime, IoCall } from 'react-icons/io5';

import { Container } from '@/components/container';
import { Button } from '@/components/ui/button';
import { siteConfig } from '../../../site.config';
import { ServicesGrid } from '@/components/blocks/services-grid';
import { GalleryGrid } from '@/components/blocks/gallery-grid';
import { Testimonials } from '@/components/blocks/testimonials';
import { CTABanner } from '@/components/blocks/cta-banner';

// Force dynamic rendering to read MIGRATION_JOB_ID at runtime
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // If this is a WP migration site, redirect to the migrated route
  if (process.env.MIGRATION_JOB_ID) {
    redirect('/migrated');
  }

  const { business, services, gallery, testimonials, maps, features } = siteConfig;
  return (
    <div className='flex flex-col'>
      <HeroSection />
      <ServicesGrid services={services} />
      <AboutSnippetSection />
      {features.hasGallery && (
        <GalleryGrid
          images={gallery.images.slice(0, 6)}
          headline={gallery.headline}
          subtext={gallery.subheadline}
          showViewAllLink
        />
      )}
      {features.hasTestimonials && (
        <Testimonials testimonials={testimonials} />
      )}
      <CTABanner
        headline='Come See Us'
        phone={business.phone}
        phoneRaw={business.phoneRaw}
        address={business.address.full}
        directionsUrl={maps.directionsUrl}
        primaryLabel='Contact Us'
        primaryHref='/contact'
      />
    </div>
  );
}

function HeroSection() {
  const { business, hours, maps } = siteConfig;
  return (
    <section className='relative min-h-[85vh] overflow-hidden'>
      <Image
        src='/images/hero.jpg'
        alt={business.name}
        fill
        priority
        className='object-cover'
      />
      <div className='absolute inset-0 bg-black/65' />
      <Container className='relative z-10 flex min-h-[85vh] flex-col items-center justify-center text-center'>
        <div className='mb-8'>
          <Image
            src='/images/logo-white.webp'
            alt={business.name}
            width={280}
            height={80}
            className='h-14 w-auto lg:h-20'
          />
        </div>
        <h1 className='mb-6 max-w-4xl leading-tight'>{business.tagline}</h1>
        <p className='mb-10 max-w-xl text-lg text-brand-text lg:text-xl'>{business.description}</p>
        <div className='flex flex-col gap-4 sm:flex-row'>
          {business.phoneRaw && (
          <Button size='lg' className='bg-brand-primary px-8 py-6 text-lg font-semibold text-black hover:bg-brand-cream' asChild>
            <a href={'tel:' + business.phoneRaw}>
              <IoCall className='mr-2 h-5 w-5' />
              Call Now
            </a>
          </Button>
          )}
          <Button size='lg' variant='outline' className='border-brand-primary px-8 py-6 text-lg text-brand-primary hover:bg-brand-primary hover:text-black' asChild>
            <a href={maps.directionsUrl} target='_blank' rel='noopener noreferrer'>
              <IoLocationSharp className='mr-2 h-5 w-5' />
              Get Directions
            </a>
          </Button>
        </div>
        <div className='mt-12 flex flex-col items-center gap-2 text-sm text-brand-text'>
          <div className='flex items-center gap-2'>
            <IoLocationSharp className='h-4 w-4 text-brand-primary' />
            <span>{business.address.full}</span>
          </div>
          <div className='flex items-center gap-2'>
            <IoTime className='h-4 w-4 text-brand-primary' />
            <span>{hours[0].days}: {hours[0].hours}</span>
          </div>
        </div>
      </Container>
    </section>
  );
}

function AboutSnippetSection() {
  const { business, about } = siteConfig;
  return (
    <section className='bg-zinc-950 py-20'>
      <Container>
        <div className='grid items-center gap-12 lg:grid-cols-2'>
          <div>
            <h2 className='mb-6'>{about.headline}</h2>
            {about.story.slice(0, 2).map((para, i) => (
              <p key={i} className='mb-4 text-brand-text'>{para}</p>
            ))}
            <Button className='mt-4 bg-brand-primary text-black hover:bg-brand-cream' asChild>
              <Link href='/about'>Our Story</Link>
            </Button>
          </div>
          <div className='relative aspect-[4/3] overflow-hidden rounded-xl'>
            <Image
              src='/images/about.jpg'
              alt={'About ' + business.name}
              fill
              className='object-cover'
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
`;

/**
 * Design 2 — "Bold Edge"
 * Left-aligned hero with accent stripe, split-screen layout.
 * Section order: Hero (left-aligned, image right) → Trust strip → Services (3-col cards) → About (reversed) → Testimonials → CTA
 */
export const DESIGN_2_PAGE = `import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { IoCall, IoCheckmarkCircle, IoStar } from 'react-icons/io5';

import { Container } from '@/components/container';
import { Button } from '@/components/ui/button';
import { siteConfig } from '../../../site.config';
import { Testimonials } from '@/components/blocks/testimonials';
import { CTABanner } from '@/components/blocks/cta-banner';

// Force dynamic rendering to read MIGRATION_JOB_ID at runtime
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  if (process.env.MIGRATION_JOB_ID) {
    redirect('/migrated');
  }

  const { business, services, testimonials, maps, features } = siteConfig;
  return (
    <div className='flex flex-col'>
      <SplitHeroSection />
      <TrustStrip />
      <ServicesCardSection />
      <AboutReversedSection />
      {features.hasTestimonials && (
        <Testimonials testimonials={testimonials} />
      )}
      <CTABanner
        headline={'Ready to Work With ' + business.name + '?'}
        phone={business.phone}
        phoneRaw={business.phoneRaw}
        address={business.address.full}
        directionsUrl={maps.directionsUrl}
        primaryLabel='Get a Free Quote'
        primaryHref='/contact'
      />
    </div>
  );
}

function SplitHeroSection() {
  const { business, hours } = siteConfig;
  return (
    <section className='relative min-h-[90vh] overflow-hidden bg-brand-bg lg:min-h-screen'>
      {/* Accent bar on left */}
      <div className='absolute left-0 top-0 h-full w-2 bg-brand-primary' />

      <div className='grid h-full min-h-[90vh] lg:min-h-screen lg:grid-cols-2'>
        {/* Content — left column */}
        <div className='flex flex-col justify-center px-8 py-20 pl-10 lg:px-16 lg:pl-20'>
          <div className='mb-8'>
            <Image
              src='/images/logo-white.webp'
              alt={business.name}
              width={220}
              height={64}
              className='h-12 w-auto'
            />
          </div>
          <p className='mb-4 text-sm font-semibold uppercase tracking-widest text-brand-primary'>
            {business.address.city}, {business.address.state}
          </p>
          <h1 className='mb-6 text-4xl font-black leading-[1.1] text-white lg:text-6xl'>
            {business.tagline}
          </h1>
          <p className='mb-10 max-w-lg text-base text-brand-text lg:text-lg'>
            {business.description}
          </p>
          <div className='flex flex-wrap gap-4'>
            {business.phoneRaw && (
              <Button size='lg' className='bg-brand-primary px-8 py-6 text-lg font-bold text-black hover:opacity-90' asChild>
                <a href={'tel:' + business.phoneRaw}>
                  <IoCall className='mr-2 h-5 w-5' />
                  {business.phone}
                </a>
              </Button>
            )}
            <Button size='lg' variant='outline' className='border-white/30 px-8 py-6 text-lg text-white hover:border-brand-primary hover:text-brand-primary' asChild>
              <Link href='/contact'>Free Quote</Link>
            </Button>
          </div>
          <p className='mt-8 text-sm text-brand-text/60'>
            {hours[0].days}: {hours[0].hours}
          </p>
        </div>

        {/* Hero image — right column */}
        <div className='relative hidden lg:block'>
          <Image
            src='/images/hero.jpg'
            alt={business.name}
            fill
            priority
            className='object-cover'
          />
          <div className='absolute inset-0 bg-gradient-to-r from-brand-bg/80 to-transparent' />
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  const { business } = siteConfig;
  const items = [
    'Licensed & Insured',
    'Free Estimates',
    'Satisfaction Guaranteed',
    'Local & Family Owned',
  ];
  return (
    <div className='border-y border-brand-primary/20 bg-zinc-900 py-5'>
      <Container>
        <div className='flex flex-wrap items-center justify-center gap-6 lg:gap-10'>
          {items.map((item) => (
            <div key={item} className='flex items-center gap-2 text-sm font-medium text-brand-text'>
              <IoCheckmarkCircle className='h-5 w-5 shrink-0 text-brand-primary' />
              {item}
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}

function ServicesCardSection() {
  const { services } = siteConfig;
  return (
    <section className='bg-brand-bg py-24'>
      <Container>
        <div className='mb-12 text-center'>
          <p className='mb-2 text-sm font-semibold uppercase tracking-widest text-brand-primary'>What We Do</p>
          <h2 className='text-white'>Our Services</h2>
        </div>
        <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-3'>
          {services.slice(0, 6).map((service, i) => (
            <div
              key={i}
              className='group rounded-xl border border-white/10 bg-zinc-900 p-8 transition-all hover:border-brand-primary/50 hover:bg-zinc-800'
            >
              <div className='mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-primary/10'>
                <IoStar className='h-6 w-6 text-brand-primary' />
              </div>
              <h3 className='mb-3 text-lg font-bold text-white'>
                {'name' in service ? (service as any).name : (service as any).title ?? ''}
              </h3>
              <p className='text-sm leading-relaxed text-brand-text'>
                {'description' in service ? (service as any).description : ''}
              </p>
            </div>
          ))}
        </div>
        <div className='mt-12 text-center'>
          <Button variant='outline' className='border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-black' asChild>
            <Link href='/services'>View All Services</Link>
          </Button>
        </div>
      </Container>
    </section>
  );
}

function AboutReversedSection() {
  const { business, about } = siteConfig;
  return (
    <section className='bg-zinc-950 py-24'>
      <Container>
        <div className='grid items-center gap-12 lg:grid-cols-2'>
          {/* Image first on desktop */}
          <div className='relative aspect-[4/3] overflow-hidden rounded-2xl order-2 lg:order-1'>
            <Image
              src='/images/about.jpg'
              alt={'About ' + business.name}
              fill
              className='object-cover'
            />
            {/* Accent corner */}
            <div className='absolute bottom-4 right-4 rounded-lg bg-brand-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-black'>
              Since {new Date().getFullYear() - 10}
            </div>
          </div>
          {/* Text second on desktop */}
          <div className='order-1 lg:order-2'>
            <p className='mb-3 text-sm font-semibold uppercase tracking-widest text-brand-primary'>
              Our Story
            </p>
            <h2 className='mb-6 text-white'>{about.headline}</h2>
            {about.story.slice(0, 2).map((para, i) => (
              <p key={i} className='mb-4 text-brand-text'>{para}</p>
            ))}
            <Button className='mt-4 bg-brand-primary font-bold text-black hover:opacity-90' asChild>
              <Link href='/about'>Learn More About Us</Link>
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
`;

/**
 * Design 3 — "Minimal Typographic"
 * Light/neutral hero with large bold type and no image overlay.
 * Section order: Hero (color bg, large type) → Services (horizontal numbered list) → About (pull quote style) → CTA
 */
export const DESIGN_3_PAGE = `import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { IoCall, IoArrowForward } from 'react-icons/io5';

import { Container } from '@/components/container';
import { Button } from '@/components/ui/button';
import { siteConfig } from '../../../site.config';
import { CTABanner } from '@/components/blocks/cta-banner';
import { GalleryGrid } from '@/components/blocks/gallery-grid';

// Force dynamic rendering to read MIGRATION_JOB_ID at runtime
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  if (process.env.MIGRATION_JOB_ID) {
    redirect('/migrated');
  }

  const { business, services, gallery, maps, features } = siteConfig;
  return (
    <div className='flex flex-col bg-zinc-950'>
      <TypeHeroSection />
      <NumberedServicesSection />
      <PullQuoteAboutSection />
      {features.hasGallery && (
        <GalleryGrid
          images={gallery.images.slice(0, 6)}
          headline={gallery.headline}
          subtext={gallery.subheadline}
          showViewAllLink
        />
      )}
      <CTABanner
        headline="Let's Get Started"
        phone={business.phone}
        phoneRaw={business.phoneRaw}
        address={business.address.full}
        directionsUrl={maps.directionsUrl}
        primaryLabel='Contact Us Today'
        primaryHref='/contact'
      />
    </div>
  );
}

function TypeHeroSection() {
  const { business, hours } = siteConfig;
  return (
    <section className='relative overflow-hidden'>
      {/* Full-bleed background image with heavy overlay */}
      <div className='absolute inset-0'>
        <Image
          src='/images/hero.jpg'
          alt={business.name}
          fill
          priority
          className='object-cover object-center'
        />
        <div className='absolute inset-0 bg-zinc-950/80' />
      </div>

      <Container className='relative z-10 pb-24 pt-28 lg:pb-36 lg:pt-40'>
        <div className='max-w-4xl'>
          {/* Logo */}
          <div className='mb-10'>
            <Image
              src='/images/logo-white.webp'
              alt={business.name}
              width={200}
              height={56}
              className='h-10 w-auto'
            />
          </div>

          {/* Large type treatment */}
          <h1 className='mb-0 text-5xl font-black leading-[0.95] tracking-tight text-white lg:text-8xl'>
            {business.tagline.split(' ').slice(0, Math.ceil(business.tagline.split(' ').length / 2)).join(' ')}
          </h1>
          <h1 className='mb-8 text-5xl font-black leading-[0.95] tracking-tight text-brand-primary lg:text-8xl'>
            {business.tagline.split(' ').slice(Math.ceil(business.tagline.split(' ').length / 2)).join(' ')}
          </h1>

          <div className='h-1 w-20 bg-brand-primary mb-8' />

          <p className='mb-10 max-w-2xl text-lg leading-relaxed text-zinc-300 lg:text-xl'>
            {business.description}
          </p>

          <div className='flex flex-wrap items-center gap-4'>
            {business.phoneRaw && (
              <Button size='lg' className='bg-brand-primary px-10 py-6 text-lg font-black text-black hover:opacity-90' asChild>
                <a href={'tel:' + business.phoneRaw}>
                  <IoCall className='mr-2 h-5 w-5' />
                  Call {business.phone}
                </a>
              </Button>
            )}
            <Button size='lg' variant='ghost' className='group px-6 py-6 text-lg text-white hover:text-brand-primary' asChild>
              <Link href='/contact'>
                Get a Quote
                <IoArrowForward className='ml-2 h-5 w-5 transition-transform group-hover:translate-x-1' />
              </Link>
            </Button>
          </div>

          <p className='mt-10 text-xs font-medium uppercase tracking-widest text-zinc-500'>
            {business.address.full} &nbsp;·&nbsp; {hours[0].days}: {hours[0].hours}
          </p>
        </div>
      </Container>
    </section>
  );
}

function NumberedServicesSection() {
  const { services } = siteConfig;
  return (
    <section className='border-t border-white/5 bg-zinc-900 py-24'>
      <Container>
        <div className='mb-16 flex items-end justify-between'>
          <div>
            <p className='mb-2 text-xs font-semibold uppercase tracking-widest text-brand-primary'>
              What We Offer
            </p>
            <h2 className='text-white'>Services</h2>
          </div>
          <Button variant='ghost' className='hidden text-brand-primary hover:text-white sm:flex' asChild>
            <Link href='/services'>
              All Services <IoArrowForward className='ml-2 h-4 w-4' />
            </Link>
          </Button>
        </div>

        <div className='divide-y divide-white/5'>
          {services.slice(0, 6).map((service, i) => (
            <div
              key={i}
              className='group flex items-start gap-8 py-8 transition-colors hover:bg-white/[0.02] lg:py-10'
            >
              <span className='w-12 shrink-0 text-right text-3xl font-black tabular-nums text-brand-primary/30 transition-colors group-hover:text-brand-primary/60'>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className='flex-1'>
                <h3 className='mb-2 text-lg font-bold text-white lg:text-xl'>
                  {'name' in service ? (service as any).name : (service as any).title ?? ''}
                </h3>
                <p className='text-sm leading-relaxed text-zinc-400'>
                  {'description' in service ? (service as any).description : ''}
                </p>
              </div>
              <IoArrowForward className='mt-1 hidden h-5 w-5 shrink-0 text-brand-primary opacity-0 transition-opacity group-hover:opacity-100 lg:block' />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function PullQuoteAboutSection() {
  const { business, about } = siteConfig;
  return (
    <section className='bg-zinc-950 py-24'>
      <Container>
        <div className='grid gap-16 lg:grid-cols-[1fr_1.2fr]'>
          <div className='flex flex-col justify-center'>
            <div className='mb-6 text-7xl font-black leading-none text-brand-primary/20'>"</div>
            <blockquote className='mb-8 text-2xl font-light leading-snug text-white lg:text-3xl'>
              {about.story[0]}
            </blockquote>
            <p className='text-sm font-semibold uppercase tracking-widest text-brand-primary'>
              — {business.name}
            </p>
            <div className='mt-10'>
              <Button className='bg-brand-primary font-bold text-black hover:opacity-90' asChild>
                <Link href='/about'>
                  Our Full Story <IoArrowForward className='ml-2 h-4 w-4' />
                </Link>
              </Button>
            </div>
          </div>
          <div className='relative aspect-[4/3] overflow-hidden rounded-2xl lg:aspect-auto'>
            <Image
              src='/images/about.jpg'
              alt={'About ' + business.name}
              fill
              className='object-cover'
            />
            <div className='absolute inset-0 bg-gradient-to-t from-zinc-950/50 to-transparent' />
          </div>
        </div>
      </Container>
    </section>
  );
}
`;

export const DESIGN_PAGES: Record<number, string> = {
  1: DESIGN_1_PAGE,
  2: DESIGN_2_PAGE,
  3: DESIGN_3_PAGE,
};

export const DESIGN_LABELS: Record<number, string> = {
  1: 'Design 1 — Classic Dark',
  2: 'Design 2 — Bold Edge',
  3: 'Design 3 — Minimal Type',
};
