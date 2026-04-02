#!/usr/bin/env node
/**
 * WooPlans Shop v2 — SSG Build Script
 * Generates static HTML for all plan pages, category pages, and homepage.
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const SITE_URL = 'https://shop.wooplans.com';
const WHATSAPP = '+237694327885';

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}
function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), {recursive: true});
  fs.writeFileSync(filePath, content, 'utf8');
}
function copy(src, dest) {
  fs.mkdirSync(path.dirname(dest), {recursive: true});
  fs.copyFileSync(src, dest);
}
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, {recursive: true});
  fs.readdirSync(src).forEach(function(file) {
    const srcFile  = path.join(src, file);
    const destFile = path.join(dest, file);
    if (fs.statSync(srcFile).isDirectory()) {
      copyDir(srcFile, destFile);
    } else {
      copy(srcFile, destFile);
    }
  });
}
function hash(content) {
  return crypto.createHash('md5').update(content).digest('hex').slice(0, 8);
}
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function slugify(text) {
  return String(text || '').toLowerCase()
    .replace(/[éèêë]/g, 'e').replace(/[àâä]/g, 'a')
    .replace(/[ùûü]/g, 'u').replace(/[ôö]/g, 'o')
    .replace(/[îï]/g, 'i').replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-').replace(/^-|-$/g, '');
}

/* ── Template engine (simple {{var}} replace + {{#list}}...{{/list}}) ──── */
function render(template, data) {
  // Process loops: {{#items}}...{{/items}}
  let result = template.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, function(_, key, inner) {
    const arr = data[key];
    if (!Array.isArray(arr)) return '';
    return arr.map(function(item) {
      if (typeof item === 'string') return inner.replace(/\{\{\.?\}\}/g, escapeHtml(item));
      return render(inner, item);
    }).join('');
  });

  // Process conditionals: {{?key}}...{{/?key}}
  result = result.replace(/\{\{\?(\w+)\}\}([\s\S]*?)\{\{\/\?\1\}\}/g, function(_, key, inner) {
    return data[key] ? render(inner, data) : '';
  });

  // Simple variable substitution
  result = result.replace(/\{\{(\w+)\}\}/g, function(_, key) {
    return data[key] !== undefined ? String(data[key]) : '';
  });

  return result;
}

/* ── Load data ───────────────────────────────────────────────────────────── */
const plans = JSON.parse(read(path.join(ROOT, 'data', 'plans.json')));

/* ── Load templates ──────────────────────────────────────────────────────── */
const tBase     = read(path.join(ROOT, 'templates', 'base.html'));
const tHome     = read(path.join(ROOT, 'templates', 'home.html'));
const tPlan     = read(path.join(ROOT, 'templates', 'plan.html'));
const tCategory = read(path.join(ROOT, 'templates', 'category.html'));
const t404      = read(path.join(ROOT, 'templates', '404.html'));

/* ── Load and hash assets ────────────────────────────────────────────────── */
const criticalCss = read(path.join(ROOT, 'assets', 'css', 'critical.css'));
const mainCss     = read(path.join(ROOT, 'assets', 'css', 'main.css'));
const jsFiles     = ['filters', 'gallery', 'turbo-nav', 'analytics'];

const cssHash = hash(mainCss);
const jsHash  = hash(jsFiles.map(f =>
  read(path.join(ROOT, 'assets', 'js', f + '.js'))).join(''));

/* ── Copy assets to dist ─────────────────────────────────────────────────── */
console.log('📁 Copying assets...');

// CSS with hash
fs.mkdirSync(path.join(DIST, 'css'), {recursive: true});
write(path.join(DIST, 'css', `main.${cssHash}.css`), mainCss);
write(path.join(DIST, 'css', 'critical.css'), criticalCss); // for SW precache

// JS with hash
fs.mkdirSync(path.join(DIST, 'js'), {recursive: true});
jsFiles.forEach(function(name) {
  const content = read(path.join(ROOT, 'assets', 'js', name + '.js'));
  write(path.join(DIST, 'js', `${name}.${jsHash}.js`), content);
});

// Fonts (no hash — long-lived)
copyDir(path.join(ROOT, 'assets', 'fonts'), path.join(DIST, 'fonts'));

// SW at root
copy(path.join(ROOT, 'sw.js'), path.join(DIST, 'sw.js'));

/* ── Build a plan card HTML ──────────────────────────────────────────────── */
function buildPlanCard(plan) {
  const img = plan.images && plan.images[0]
    ? `${plan.images[0]}?width=400&quality=75&format=webp`
    : 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=75&auto=format&fm=webp';

  const imgAlt = escapeHtml(`${plan.title} - Plan ${plan.type}`);
  const price = (plan.price || 14900).toLocaleString('fr-FR');
  const ratingStars = '★'.repeat(Math.floor(parseFloat(plan.rating) || 5));
  const isNew = plan.reviews < 5;

  return `<a href="/plans/${plan.slug}/" class="plan-card" data-filter-item data-type="${escapeHtml(plan.type)}" aria-label="${escapeHtml(plan.title)}">
  <div class="card-img-wrap">
    <img class="card-img" src="${img}" alt="${imgAlt}" width="400" height="300" loading="lazy">
    <span class="card-badge${isNew ? ' new' : ''}">${isNew ? 'Nouveau' : 'Disponible'}</span>
  </div>
  <div class="card-body">
    <div class="card-type">${escapeHtml(plan.type === 'villa' ? 'Villa' : 'Duplex')}</div>
    <div class="card-title">${escapeHtml(plan.title)}</div>
    <div class="card-subtitle">${escapeHtml(plan.subtitle || '')}</div>
    <div class="card-specs">
      <span class="spec"><span class="spec-icon">🛏</span>${plan.rooms} ch.</span>
      <span class="spec"><span class="spec-icon">🚿</span>${plan.bathrooms} SDB</span>
      ${plan.surface ? `<span class="spec"><span class="spec-icon">📐</span>${plan.surface} m²</span>` : ''}
    </div>
    <div class="card-footer">
      <div class="card-price">${price} <span>FCFA</span></div>
      <span class="card-btn">Voir le Plan →</span>
    </div>
  </div>
</a>`;
}

/* ── Build gallery thumbs ────────────────────────────────────────────────── */
function buildGalleryThumbs(plan) {
  if (!plan.images || !plan.images.length) return '';
  return plan.images.map(function(img, i) {
    const thumb = `${img}?width=160&quality=70&format=webp`;
    return `<img class="gal-thumb${i === 0 ? ' active' : ''}" src="${thumb}" alt="${escapeHtml(plan.title)} image ${i + 1}" width="80" height="56" loading="lazy" role="listitem">`;
  }).join('\n      ');
}

/* ── Build features list ─────────────────────────────────────────────────── */
function buildFeaturesList(features) {
  if (!features || !features.length) return '';
  return features.map(function(f) {
    return `<li>${escapeHtml(f)}</li>`;
  }).join('\n        ');
}

/* ── Build similar plans section ─────────────────────────────────────────── */
function buildSimilarPlans(plan) {
  const similar = plans
    .filter(function(p) { return p.id !== plan.id && p.type === plan.type; })
    .slice(0, 3);
  if (!similar.length) return '';
  return `<section class="similar-section" aria-label="Plans similaires">
  <h2 class="similar-title">Plans ${plan.type === 'villa' ? 'Villas' : 'Duplex'} Similaires</h2>
  <div class="similar-grid">
    ${similar.map(buildPlanCard).join('\n    ')}
  </div>
</section>`;
}

/* ── Build JSON-LD for plan ──────────────────────────────────────────────── */
function buildPlanJsonLd(plan) {
  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: plan.title,
    description: plan.description,
    image: plan.images || [],
    brand: {
      '@type': 'Brand',
      name: 'WooPlans'
    },
    offers: {
      '@type': 'Offer',
      price: plan.price || 14900,
      priceCurrency: 'XAF',
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}/plans/${plan.slug}/`
    }
  };
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Accueil',
        item: `${SITE_URL}/`
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: plan.type === 'villa' ? 'Villas' : 'Duplex',
        item: `${SITE_URL}/plans/${plan.type}s/`
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: plan.title,
        item: `${SITE_URL}/plans/${plan.slug}/`
      }
    ]
  };
  return JSON.stringify([productLd, breadcrumbLd]);
}

/* ── Build JSON-LD for homepage ──────────────────────────────────────────── */
function buildHomeJsonLd() {
  const websiteLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'WooPlans',
    url: `${SITE_URL}/`,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  };
  const orgLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'WooPlans',
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.ico`,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: WHATSAPP,
      contactType: 'customer service'
    }
  };
  return JSON.stringify([websiteLd, orgLd]);
}

/* ── Build JSON-LD for category page ────────────────────────────────────── */
function buildCategoryJsonLd(type, pageTitle, pageUrl) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: pageTitle,
    url: pageUrl,
    description: `Catalogue de plans de ${type === 'villa' ? 'villas' : 'duplex'} modernes pour l'Afrique francophone`
  });
}

/* ── Wrap content in base template ──────────────────────────────────────── */
function wrapBase(content, meta) {
  const preloadImage = meta.preloadImage
    ? `<link rel="preload" as="image" href="${meta.preloadImage}">`
    : '';

  const pageScripts = meta.pageScripts || '';

  let html = tBase
    .replace('{{title}}',          meta.title || 'WooPlans')
    .replace('{{description}}',    meta.description || '')
    .replace('{{canonical}}',      meta.canonical || SITE_URL)
    .replace('{{ogType}}',         meta.ogType || 'website')
    .replace('{{ogTitle}}',        escapeHtml(meta.ogTitle || meta.title || 'WooPlans'))
    .replace('{{ogDescription}}',  escapeHtml(meta.ogDescription || meta.description || ''))
    .replace('{{ogImage}}',        meta.ogImage || `${SITE_URL}/og-image.jpg`)
    .replace('{{ogUrl}}',          meta.canonical || SITE_URL)
    .replace('{{preloadImage}}',   preloadImage)
    .replace('{{criticalCss}}',    criticalCss)
    .replace(/\{\{cssHash\}\}/g,   cssHash)
    .replace(/\{\{jsHash\}\}/g,    jsHash)
    .replace('{{jsonLd}}',         meta.jsonLd || '{}')
    .replace('{{bodyClass}}',      meta.bodyClass || '')
    .replace('{{content}}',        content)
    .replace('{{pageScripts}}',    pageScripts);

  return html;
}

/* ── Generate plan pages ─────────────────────────────────────────────────── */
console.log('📄 Generating plan pages...');
const redirectLines = [];

plans.forEach(function(plan) {
  const typeLabel = plan.type === 'villa' ? 'Villa' : 'Duplex';
  const firstImage = plan.images && plan.images[0] ? plan.images[0] : '';
  const ogImage = firstImage ? `${firstImage}?width=1200&quality=80&format=webp` : '';

  // Terrain spec
  const terrainSpec = plan.terrain
    ? `<div class="plan-spec" role="listitem">
          <span class="plan-spec-val">${escapeHtml(plan.terrain)}</span>
          <span class="plan-spec-label">Terrain min.</span>
        </div>`
    : '';

  // Basic features list for sidebar
  const basicFeaturesList = buildFeaturesList(plan.features || [
    'Plan de distribution avec dimensions',
    'Rendus 3D extérieurs',
    'Tableau de surface des pièces',
    'Devis estimatif en FCFA'
  ]);

  // Plan features
  const allFeatures = [...(plan.features || []), ...(plan.extrasBasic || [])];
  const featuresList = buildFeaturesList(allFeatures);

  const priceComplete = (plan.priceComplete || 130000).toLocaleString('fr-FR');

  let planContent = tPlan
    .replace(/\{\{type\}\}/g,            plan.type)
    .replace(/\{\{typeLabel\}\}/g,        typeLabel)
    .replace(/\{\{title\}\}/g,            escapeHtml(plan.title))
    .replace(/\{\{subtitle\}\}/g,         escapeHtml(plan.subtitle || ''))
    .replace(/\{\{rooms\}\}/g,            plan.rooms)
    .replace(/\{\{bathrooms\}\}/g,        plan.bathrooms)
    .replace(/\{\{surface\}\}/g,          plan.surface || '')
    .replace(/\{\{floors\}\}/g,           plan.floors || 1)
    .replace('{{terrainSpec}}',           terrainSpec)
    .replace('{{description}}',           escapeHtml(plan.description || ''))
    .replace('{{featuresList}}',          featuresList)
    .replace('{{basicFeaturesList}}',     basicFeaturesList)
    .replace('{{estimateCost}}',          escapeHtml(plan.estimateCost || ''))
    .replace('{{priceComplete}}',         priceComplete)
    .replace('{{chariowBasicUrl}}',       plan.chariowBasicUrl || '#')
    .replace(/\{\{chariowCompleteUrl\}\}/g, plan.chariowCompleteUrl || '#')
    .replace('{{firstImage}}',            firstImage)
    .replace('{{imageCount}}',            (plan.images || []).length)
    .replace('{{galleryThumbs}}',         buildGalleryThumbs(plan))
    .replace('{{galleryImages}}',         JSON.stringify(plan.images || []))
    .replace('{{similarPlans}}',          buildSimilarPlans(plan))
    .replace(/\{\{jsHash\}\}/g,           jsHash);

  const title = `${plan.title} – Plan de Maison ${plan.id.toUpperCase()} | WooPlans`;
  const descSurface = plan.surface ? `, ${plan.surface} m²` : '';
  const description = `Téléchargez le plan ${plan.title}${descSurface}, ${plan.rooms} chambres. Plan détaillé + estimation coûts construction. Conçu pour l'Afrique.`.slice(0, 160);

  const dataAttrs = `data-plan-price="${plan.price || 14900}" data-plan-title="${escapeHtml(plan.title)}" data-plan-id="${escapeHtml(plan.id)}"`;
  planContent = `<div ${dataAttrs}>${planContent}</div>`;

  const html = wrapBase(planContent, {
    title,
    description,
    canonical: `${SITE_URL}/plans/${plan.slug}/`,
    ogType: 'product',
    ogTitle: title,
    ogDescription: description,
    ogImage,
    preloadImage: firstImage || '',
    jsonLd: buildPlanJsonLd(plan),
    bodyClass: 'plan-detail-page'
  });

  write(path.join(DIST, 'plans', plan.slug, 'index.html'), html);

  // Redirect from /plans/<id> to new slug
  redirectLines.push(`/plans/${plan.id}  /plans/${plan.slug}/  301`);
});

/* ── Generate homepage ───────────────────────────────────────────────────── */
console.log('🏠 Generating homepage...');
const plansGrid = plans.map(buildPlanCard).join('\n    ');
const homeContent = tHome
  .replace('{{plansGrid}}', plansGrid)
  .replace(/\{\{jsHash\}\}/g, jsHash);

const homeTitle = "WooPlans – Plans de Maison Modernes pour l'Afrique | Villas & Duplex";
const homeDesc  = "Téléchargez instantanément des plans de maison conçus pour l'Afrique. +50 villas et duplex modernes avec estimation des coûts de construction. Cameroun, Côte d'Ivoire, Sénégal.";
const firstHeroImg = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=75&auto=format&fm=webp';

const homeHtml = wrapBase(homeContent, {
  title: homeTitle,
  description: homeDesc,
  canonical: `${SITE_URL}/`,
  ogType: 'website',
  ogTitle: homeTitle,
  ogDescription: homeDesc,
  ogImage: firstHeroImg,
  jsonLd: buildHomeJsonLd(),
  bodyClass: 'home-page'
});

write(path.join(DIST, 'index.html'), homeHtml);

/* ── Generate category pages ─────────────────────────────────────────────── */
console.log('📁 Generating category pages...');
const categories = [
  {
    type: 'villa',
    slug: 'villas',
    pageTitle: 'Plans de Villas Modernes',
    categoryLabel: 'Villas',
    categoryIntro: 'Découvrez notre collection de plans de villas modernes, conçus pour les terrains en Afrique francophone. Chaque plan inclut les dimensions détaillées et une estimation des coûts de construction.',
    titleTag: 'Plans de Villas Modernes – WooPlans',
    metaDesc: 'Téléchargez des plans de villas modernes pour l\'Afrique. Plans détaillés avec estimation des coûts. Adaptés au Cameroun, Côte d\'Ivoire et Sénégal.'
  },
  {
    type: 'duplex',
    slug: 'duplex',
    pageTitle: 'Plans de Duplex Modernes',
    categoryLabel: 'Duplex',
    categoryIntro: 'Explorez notre sélection de plans de duplex contemporains avec 2 étages, conçus pour maximiser l\'espace en milieu urbain africain. Solutions idéales pour famille nombreuse ou investissement locatif.',
    titleTag: 'Plans de Duplex Modernes – WooPlans',
    metaDesc: 'Plans de duplex modernes téléchargeables pour l\'Afrique. Architecture sur 2 niveaux avec estimation des coûts de construction. Cameroun, Côte d\'Ivoire, Sénégal.'
  }
];

categories.forEach(function(cat) {
  const filtered = plans.filter(function(p) { return p.type === cat.type; });
  const grid = filtered.map(buildPlanCard).join('\n    ');
  const catContent = tCategory
    .replace('{{pageTitle}}',    cat.pageTitle)
    .replace('{{categoryLabel}}', cat.categoryLabel)
    .replace('{{categoryIntro}}', cat.categoryIntro)
    .replace('{{plansGrid}}',    grid);

  const catUrl = `${SITE_URL}/plans/${cat.slug}/`;
  const catHtml = wrapBase(catContent, {
    title: cat.titleTag,
    description: cat.metaDesc,
    canonical: catUrl,
    ogType: 'website',
    ogTitle: cat.titleTag,
    ogDescription: cat.metaDesc,
    ogImage: (filtered[0] && filtered[0].images && filtered[0].images[0]) || '',
    jsonLd: buildCategoryJsonLd(cat.type, cat.pageTitle, catUrl),
    bodyClass: 'category-page'
  });

  write(path.join(DIST, 'plans', cat.slug, 'index.html'), catHtml);
});

/* ── Generate 404 page ───────────────────────────────────────────────────── */
console.log('🔍 Generating 404 page...');
const notFoundHtml = wrapBase(t404, {
  title: 'Page introuvable – WooPlans',
  description: 'La page que vous cherchez n\'existe pas.',
  canonical: `${SITE_URL}/404`,
  ogType: 'website',
  ogTitle: 'Page introuvable – WooPlans',
  ogDescription: 'La page que vous cherchez n\'existe pas.',
  jsonLd: '{}',
  bodyClass: '404-page'
});
write(path.join(DIST, '404.html'), notFoundHtml);

/* ── Generate sitemap.xml ────────────────────────────────────────────────── */
console.log('🗺  Generating sitemap.xml...');
const today = new Date().toISOString().split('T')[0];
const sitemapUrls = [
  `  <url>\n    <loc>${SITE_URL}/</loc>\n    <lastmod>${today}</lastmod>\n    <priority>1.0</priority>\n  </url>`,
  `  <url>\n    <loc>${SITE_URL}/plans/villas/</loc>\n    <lastmod>${today}</lastmod>\n    <priority>0.8</priority>\n  </url>`,
  `  <url>\n    <loc>${SITE_URL}/plans/duplex/</loc>\n    <lastmod>${today}</lastmod>\n    <priority>0.8</priority>\n  </url>`,
  ...plans.map(function(p) {
    return `  <url>\n    <loc>${SITE_URL}/plans/${p.slug}/</loc>\n    <lastmod>${today}</lastmod>\n    <priority>0.6</priority>\n  </url>`;
  })
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.join('\n')}
</urlset>`;
write(path.join(DIST, 'sitemap.xml'), sitemap);

/* ── Generate robots.txt ─────────────────────────────────────────────────── */
console.log('🤖 Generating robots.txt...');
write(path.join(DIST, 'robots.txt'),
  `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);

/* ── Generate _redirects ─────────────────────────────────────────────────── */
console.log('↪  Generating _redirects...');
const redirectsContent = redirectLines.join('\n') + '\n';
write(path.join(DIST, '_redirects'), redirectsContent);

/* ── Copy static files ───────────────────────────────────────────────────── */
// Copy admin.html and analytics.html if they exist
['admin.html', 'analytics.html'].forEach(function(file) {
  const src = path.join(ROOT, file);
  if (fs.existsSync(src)) {
    copy(src, path.join(DIST, file));
    console.log(`📋 Copied ${file}`);
  }
});

/* ── Done ────────────────────────────────────────────────────────────────── */
const planCount  = plans.length;
const totalPages = planCount + 2 + 1 + 1; // plans + categories + home + 404
console.log(`\n✅ Build complete!`);
console.log(`   • ${planCount} plan pages`);
console.log(`   • 2 category pages (villas, duplex)`);
console.log(`   • Homepage`);
console.log(`   • 404 page`);
console.log(`   • Total: ${totalPages} HTML pages`);
console.log(`   • sitemap.xml, robots.txt, _redirects generated`);
console.log(`   • CSS hash: ${cssHash}, JS hash: ${jsHash}`);
console.log(`\n   Output: ${DIST}/`);
