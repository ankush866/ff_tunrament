const SITE_URL = 'https://ff-tunrament-4.onrender.com';
const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const FOUNDER_ID = `${SITE_URL}/about#founder`;
const LOGO_URL = `${SITE_URL}/vlexa-logo.svg`;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface RouteSeoSpec {
  isPrivate: boolean;
  canonicalPath: string;
  title: string;
  description: string;
  ogType: 'website' | 'profile';
  extraJsonLd?: Record<string, unknown>;
  crawlerBodyHtml: string;
}

const PUBLIC_NAV_HTML = `
  <nav aria-label="Primary navigation">
    <a href="/">Home</a> |
    <a href="/tournaments">Tournaments</a> |
    <a href="/live-rooms">Live Rooms</a> |
    <a href="/leaderboard">Leaderboard</a> |
    <a href="/faq">FAQ</a> |
    <a href="/about">About the Founder</a>
  </nav>
`.trim();

const PUBLIC_FOOTER_HTML = `
  <footer>
    <p>© 2026 Vlexa. All rights reserved. Founded &amp; Developed by <a href="/about">Ankush Sharma</a>.</p>
    <p>
      <a href="/about">About the Founder</a> |
      <a href="/page/tournament-rules">Tournament Rules</a> |
      <a href="/page/privacy-policy">Privacy Policy</a> |
      <a href="/page/terms-and-conditions">Terms &amp; Conditions</a> |
      <a href="/page/refund-policy">Refund Policy</a>
    </p>
  </footer>
`.trim();

const PAGE_DESCRIPTIONS: Record<string, { title: string; h1: string; description: string; body: string }> = {
  'about-us': {
    title: 'About Vlexa – Free Fire Tournament Platform',
    h1: 'About Vlexa',
    description: 'Learn about Vlexa, an independently developed Free Fire Tournament Management Platform.',
    body: '<p>Vlexa is an independently developed Free Fire Tournament Management Platform founded and developed by <a href="/about">Ankush Sharma</a>.</p>'
  },
  'contact-us': {
    title: 'Contact Support | Vlexa',
    h1: 'Contact Support',
    description: 'Reach Vlexa tournament support via help tickets or official helpline channels.',
    body: '<p>Reach Vlexa support via Support Tickets inside your player account or our WhatsApp helpline.</p>'
  },
  'privacy-policy': {
    title: 'Privacy Policy | Vlexa',
    h1: 'Privacy Policy',
    description: 'Read how Vlexa handles tournament registration data and player privacy.',
    body: '<p>Your Vlexa account information and tournament verification records are protected and used strictly for match operations.</p>'
  },
  'terms-and-conditions': {
    title: 'Terms & Conditions | Vlexa',
    h1: 'Terms &amp; Conditions',
    description: 'Review official platform terms and conditions for participating on Vlexa.',
    body: '<p>Tournament slots are confirmed after verification on Vlexa. Sharing private room credentials with non-participants leads to disqualification.</p>'
  },
  'refund-policy': {
    title: 'Refund Policy | Vlexa',
    h1: 'Refund Policy',
    description: 'Understand match cancellation and entry fee refund guidelines on Vlexa.',
    body: '<p>Full refunds are issued within 24 hours if a scheduled match is cancelled by Vlexa organizers.</p>'
  },
  'tournament-rules': {
    title: 'Tournament Rules & Fair Play | Vlexa',
    h1: 'Tournament Rules &amp; Fair Play',
    description: 'Read official Free Fire mobile tournament rules and fair play policies on Vlexa.',
    body: '<p>Official Free Fire Battle Royale scoring rules on Vlexa: mobile-only lobbies, no emulators, scripts, or teaming.</p>'
  },
  'fair-play-policy': {
    title: 'Fair Play & Anti-Cheat Policy | Vlexa',
    h1: 'Fair Play &amp; Anti-Cheat Policy',
    description: 'Review Vlexa fair play standards and zero-tolerance anti-cheat guidelines for Free Fire.',
    body: '<p>Vlexa enforces a strict zero-tolerance policy against aimbots, wallhacks, teaming, and unauthorized third-party tools.</p>'
  }
};

function getRouteSeoSpec(rawPath: string): RouteSeoSpec {
  const cleanPath = (rawPath.split('?')[0] || '/').replace(/\/+$/, '') || '/';

  if (
    cleanPath === '/admin' ||
    cleanPath.startsWith('/admin/') ||
    cleanPath === '/dashboard' ||
    cleanPath.startsWith('/dashboard/') ||
    cleanPath === '/wallet' ||
    cleanPath.startsWith('/wallet/') ||
    cleanPath === '/login'
  ) {
    return {
      isPrivate: true,
      canonicalPath: cleanPath,
      title: cleanPath.startsWith('/admin') ? 'Admin Panel | Vlexa' : 'Player Account | Vlexa',
      description: 'Vlexa player account portal.',
      ogType: 'website',
      crawlerBodyHtml: ''
    };
  }

  if (cleanPath === '/about') {
    const title = 'About Ankush Sharma – Founder & Developer of Vlexa';
    const description =
      'Ankush Sharma is a Self-taught Aspiring Full-Stack Developer and Founder & Developer of Vlexa, an independently developed Free Fire Tournament Management Platform.';
    return {
      isPrivate: false,
      canonicalPath: '/about',
      title,
      description,
      ogType: 'profile',
      extraJsonLd: {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        '@id': `${SITE_URL}/about#profilepage`,
        url: `${SITE_URL}/about`,
        name: title,
        description,
        isPartOf: {
          '@id': WEBSITE_ID
        },
        mainEntity: {
          '@id': FOUNDER_ID
        }
      },
      crawlerBodyHtml: `
        <header>${PUBLIC_NAV_HTML}</header>
        <main>
          <section aria-labelledby="about-founder-heading">
            <p>About the Founder</p>
            <h1 id="about-founder-heading">Ankush Sharma</h1>
            <p>Founder &amp; Developer of Vlexa · Self-taught Aspiring Full-Stack Developer</p>
            <p><strong>Ankush Sharma</strong> is a <strong>Self-taught Aspiring Full-Stack Developer</strong> and the <strong>Founder &amp; Developer of Vlexa</strong>.</p>
            <p>Vlexa is an independently developed Free Fire Tournament Management Platform created to give mobile esports players a structured, transparent arena for competitive Solo, Duo, and Squad matches, live room scheduling, slot tracking, and match results.</p>
            <h2>Official Profiles</h2>
            <ul>
              <li><a href="https://www.linkedin.com/in/ankush-sharma-4a9911414/" rel="noopener noreferrer">LinkedIn – Ankush Sharma</a></li>
              <li><a href="https://github.com/ankush866" rel="noopener noreferrer">GitHub – @ankush866</a></li>
              <li><a href="${SITE_URL}/">Vlexa – Official Platform</a></li>
            </ul>
          </section>
          <section>
            <h2>Full-Stack Development</h2>
            <p>Independently architected and maintained web application for competitive Free Fire tournaments.</p>
            <h2>Tournament Management</h2>
            <p>Organized Solo, Duo &amp; Squad brackets with clear rules, IST schedules, and match standings.</p>
            <h2>Player-First Fair Play</h2>
            <p>Built for transparent verification, controlled room access, and clean mobile responsiveness.</p>
          </section>
        </main>
        ${PUBLIC_FOOTER_HTML}
      `.trim()
    };
  }

  if (cleanPath === '/tournaments') {
    return {
      isPrivate: false,
      canonicalPath: '/tournaments',
      title: 'Free Fire Tournaments & Matches | Vlexa',
      description:
        'Browse Solo, Duo, Squad & Clash Squad Free Fire tournaments on Vlexa. Check entry fees, prize pools, match schedules, and available slots.',
      ogType: 'website',
      crawlerBodyHtml: `
        <header>${PUBLIC_NAV_HTML}</header>
        <main>
          <h1>Matches &amp; Tournaments</h1>
          <p>Browse Solo, Duo, Squad, and Clash Squad Free Fire tournaments hosted on Vlexa. Reserve slots and review room schedules.</p>
        </main>
        ${PUBLIC_FOOTER_HTML}
      `.trim()
    };
  }

  if (cleanPath === '/live-rooms') {
    return {
      isPrivate: false,
      canonicalPath: '/live-rooms',
      title: 'Live Free Fire Custom Rooms & Schedules | Vlexa',
      description:
        'Track upcoming and live Free Fire tournament room opening times and IST match countdowns on Vlexa.',
      ogType: 'website',
      crawlerBodyHtml: `
        <header>${PUBLIC_NAV_HTML}</header>
        <main>
          <h1>Live Match Rooms</h1>
          <p>Track scheduled Free Fire custom room opening times and IST match start countdowns on Vlexa.</p>
        </main>
        ${PUBLIC_FOOTER_HTML}
      `.trim()
    };
  }

  if (cleanPath === '/leaderboard') {
    return {
      isPrivate: false,
      canonicalPath: '/leaderboard',
      title: 'Player Rankings & Tournament Leaderboard | Vlexa',
      description:
        'View verified Free Fire tournament winners, kill leaders, and top-ranked players across matches on Vlexa.',
      ogType: 'website',
      crawlerBodyHtml: `
        <header>${PUBLIC_NAV_HTML}</header>
        <main>
          <h1>Player Rankings</h1>
          <p>Top Free Fire players on Vlexa ranked by tournament points, wins, kills, and cash prizes.</p>
        </main>
        ${PUBLIC_FOOTER_HTML}
      `.trim()
    };
  }

  if (cleanPath === '/faq') {
    return {
      isPrivate: false,
      canonicalPath: '/faq',
      title: 'Frequently Asked Questions & Rules | Vlexa',
      description:
        'Find answers about joining Free Fire tournaments, room credentials, payment verification, and fair play guidelines on Vlexa.',
      ogType: 'website',
      crawlerBodyHtml: `
        <header>${PUBLIC_NAV_HTML}</header>
        <main>
          <h1>Frequently Asked Questions</h1>
          <p>Find answers about joining Free Fire tournaments, room credentials, UPI verification, and fair play rules on Vlexa.</p>
        </main>
        ${PUBLIC_FOOTER_HTML}
      `.trim()
    };
  }

  if (cleanPath.startsWith('/page/')) {
    const rawSlug = cleanPath.replace('/page/', '').trim() || 'privacy-policy';
    const safeSlug = encodeURIComponent(rawSlug);
    const info = PAGE_DESCRIPTIONS[rawSlug];
    const title = info ? info.title : `${escapeHtml(rawSlug.replace(/-/g, ' '))} | Vlexa`;
    const description = info
      ? info.description
      : 'Vlexa is an independently developed Free Fire Tournament Management Platform founded and developed by Ankush Sharma.';
    const h1 = info ? info.h1 : escapeHtml(rawSlug.replace(/-/g, ' '));
    const body = info ? info.body : `<p>${escapeHtml(description)}</p>`;
    return {
      isPrivate: false,
      canonicalPath: `/page/${safeSlug}`,
      title,
      description,
      ogType: 'website',
      crawlerBodyHtml: `
        <header>${PUBLIC_NAV_HTML}</header>
        <main>
          <article>
            <h1>${h1}</h1>
            ${body}
          </article>
        </main>
        ${PUBLIC_FOOTER_HTML}
      `.trim()
    };
  }

  if (cleanPath.startsWith('/tournament/')) {
    const rawId = cleanPath.replace('/tournament/', '').trim();
    const safeId = encodeURIComponent(rawId);
    const title = `Free Fire Tournament #${escapeHtml(rawId)} | Vlexa`;
    const description =
      'View match rules, prize pool, entry fee, IST schedule, and slot availability for this Free Fire tournament on Vlexa.';
    return {
      isPrivate: false,
      canonicalPath: `/tournament/${safeId}`,
      title,
      description,
      ogType: 'website',
      crawlerBodyHtml: `
        <header>${PUBLIC_NAV_HTML}</header>
        <main>
          <h1>Free Fire Tournament #${escapeHtml(rawId)}</h1>
          <p>${escapeHtml(description)}</p>
          <p><a href="/tournaments">Browse all Vlexa tournaments</a></p>
        </main>
        ${PUBLIC_FOOTER_HTML}
      `.trim()
    };
  }

  // Homepage fallback (`/`)
  const homeTitle = 'Vlexa – Free Fire Tournament Platform';
  const homeDescription =
    'Vlexa is an independently developed Free Fire Tournament Management Platform founded and developed by Ankush Sharma, featuring competitive matches, live room schedules & rankings.';
  return {
    isPrivate: false,
    canonicalPath: '/',
    title: homeTitle,
    description: homeDescription,
    ogType: 'website',
    crawlerBodyHtml: `
      <header>${PUBLIC_NAV_HTML}</header>
      <main>
        <section>
          <h1>Compete &amp; Win in Free Fire Arena</h1>
          <p>Vlexa is an independently developed Free Fire Tournament Management Platform founded and developed by <a href="/about">Ankush Sharma</a>. Join daily Solo, Duo &amp; Squad matches with transparent room scheduling and live rankings.</p>
          <p><a href="/tournaments">Join Live Matches</a> | <a href="/live-rooms">Live Room ID</a> | <a href="/about">About the Founder</a></p>
        </section>
        <section>
          <h2>Fair Play Arena</h2>
          <p>Mobile-only lobbies with verified players and anti-cheat checks.</p>
          <h2>Fast UPI &amp; Rooms</h2>
          <p>Quick UPI verification and scheduled Room ID &amp; Password unlock.</p>
          <h2>Founder &amp; Developer</h2>
          <p>Independently developed by <a href="/about">Ankush Sharma</a> (<a href="https://github.com/ankush866" rel="noopener noreferrer">GitHub</a> · <a href="https://www.linkedin.com/in/ankush-sharma-4a9911414/" rel="noopener noreferrer">LinkedIn</a>).</p>
        </section>
      </main>
      ${PUBLIC_FOOTER_HTML}
    `.trim()
  };
}

export function applyServerSeoToHtml(html: string, reqPath: string): string {
  const spec = getRouteSeoSpec(reqPath);
  const canonicalUrl = `${SITE_URL}${spec.canonicalPath}`;
  const escapedTitle = escapeHtml(spec.title);
  const escapedDesc = escapeHtml(spec.description);
  const escapedUrl = escapeHtml(canonicalUrl);

  let out = html;

  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapedTitle}</title>`);
  out = out.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${escapedDesc}" />`
  );
  out = out.replace(
    /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="robots" content="${spec.isPrivate ? 'noindex, nofollow' : 'index, follow'}" />`
  );

  if (spec.isPrivate) {
    out = out.replace(/\s*<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i, '');
  } else {
    out = out.replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      `<link rel="canonical" href="${escapedUrl}" />`
    );
  }

  out = out.replace(
    /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:type" content="${spec.ogType}" />`
  );
  out = out.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${escapedTitle}" />`
  );
  out = out.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${escapedDesc}" />`
  );
  out = out.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${escapedUrl}" />`
  );
  out = out.replace(
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:image" content="${LOGO_URL}" />`
  );
  out = out.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${escapedTitle}" />`
  );
  out = out.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${escapedDesc}" />`
  );

  if (spec.extraJsonLd) {
    const jsonTag = `<script id="vlexa-page-jsonld" type="application/ld+json">${JSON.stringify(spec.extraJsonLd)}</script>\n  </head>`;
    out = out.replace(/<\/head>/i, jsonTag);
  }

  if (spec.crawlerBodyHtml) {
    out = out.replace(
      /<div\s+id="root"><\/div>/i,
      `<div id="root">${spec.crawlerBodyHtml}</div>`
    );
  }

  return out;
}
