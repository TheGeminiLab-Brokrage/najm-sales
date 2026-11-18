/* ------------------------------------------------------------------
   Najm Developments: the sales app. Everything the pages read.

   Where every value came from is in BRANDING.md. Nothing here prints on
   a customer's document yet: the offer PDF is the next step.
   ------------------------------------------------------------------ */

var CONFIG = {
  build: 21,
  /* the ?v= on every page's files: ONE number for all, so the CSS is one download, not one per page */
  stamp: 28,

  /* the daily target under a sales agent's sales (Main Marks CONFIG.salesDay): at least 3 offers a day as a
     general broadcast to all the companies. Muhanad's rule from Main Marks, ASSUMED for Najm until Najm says. */
  salesDay: { broadcasts: 3 },

  brand: {
    name: 'Najm Developments',
    /* exact, read off the vector files (BRANDING.md) */
    navy: '#18263E',        /* CP ground, every page */
    navyDeep: '#0E1828',    /* a darker step of the ground, for wells */
    navyLift: '#203253',    /* the logo's own navy, one step lighter */
    teal: '#54C6C1',        /* CP accent: the ONE accent, "chosen" */
    tealDeep: '#07989E',
    tagline: 'Building trust. Creating value.'
  },

  /* DEMO accounts. The two demo ones, then Najm's sales team (the team sheet,
     "Sales team 2.xlsx", and the broker sheet's own spellings, build 8).
     agentAs / managerAs: how the broker sheet writes this person, so the send
     step offers only the companies they handle (js/brokers.js). The demo agent
     and manager see every company. Same demo password for all, shown on the
     sign-in; a real sign-in (as Main Marks' store) replaces this. */
  /* the real store (build 19): the team, the companies and the inventory come from it */
  store: { url: 'https://lmwuhbyjzpkxrloohvmk.supabase.co', anon: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxtd3VoYnlqenBreHJsb29odm1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ2OTQ3ODMsImV4cCI6MjExMDI3MDc4M30.Hm5oFYqDYq2x-TvXJXx_-DZMTkHO-kr5d-pRrBI_GUU' },
  usersDemo: false,
  users: [],
  roles: {
    sales: { label: 'Sales agent' },
    sales_manager: { label: 'Sales manager' }
  },

  projects: [
    {
      id: 'veln',
      name: 'VELN',
      logo: 'img/veln-logo.svg',
      place: 'New Cairo',
      where: 'Yasmine district',
      kind: 'Mixed-use mall',
      card: 'img/veln-aerial-night.jpg',
      /* VELN's own CI, used only on its entry (the logo build) and its logo */
      ci: { ground: '#D9D1BD', ink: '#343434', taupe: '#6B685A', gold: '#EDB964' },
      facts: [
        { k: 'Structure', v: '2 basements · ground · 3 floors' },
        { k: 'Uses', v: 'Shops · Offices · Clinics' }
      ],
      factsSource: 'Najm Sales Orientation deck, "Project structure" and "Unit types"',

      /* the chooser: the night render, lights off; each line switches on
         its own floors. Outlines are in the picture's 1600 x 900 space,
         measured off a 50 px grid (scratch notes in BRANDING.md). */
      stage: {
        img: 'img/veln-night.jpg',
        w: 1600, h: 900,
        view: [140, 150, 1180, 642],      /* crops the render's own watermark */
        floors: {
          ground: [[150,718],[255,712],[350,707],[470,705],[600,706],[740,704],[900,699],[1020,697],[1150,700],[1250,706],[1292,712],
                   [1292,792],[1000,790],[740,792],[600,795],[150,796]],
          first:  [[150,640],[205,630],[255,622],[300,615],[350,610],[450,612],[590,616],[650,620],[740,618],[800,613],[900,610],[1020,610],[1150,614],[1250,622],[1292,640],
                   [1292,712],[1250,706],[1150,700],[1020,697],[900,699],[740,704],[600,706],[470,705],[350,707],[255,712],[150,718]],
          second: [[150,560],[205,548],[255,535],[300,515],[350,503],[410,500],[470,502],[530,505],[590,512],[650,522],[700,522],[740,525],[800,520],[900,515],[1000,512],[1070,512],[1150,516],[1220,530],[1260,540],[1292,555],
                   [1292,640],[1250,622],[1150,614],[1020,610],[900,610],[800,613],[740,618],[650,620],[590,616],[450,612],[350,610],[300,615],[255,622],[205,630],[150,640]],
          third:  [[150,488],[205,470],[255,450],[300,428],[350,410],[410,400],[470,400],[530,405],[590,430],[610,455],[650,470],[700,468],[740,455],[800,435],[870,422],[970,418],[1070,420],[1150,425],[1220,440],[1260,462],[1292,505],
                   [1292,555],[1260,540],[1220,530],[1150,516],[1070,512],[1000,512],[900,515],[800,520],[740,525],[700,522],[650,522],[590,512],[530,505],[470,502],[410,500],[350,503],[300,515],[255,535],[205,548],[150,560]]
        },
        floorName: { ground: 'Ground floor', first: 'First floor', second: 'Second floor', third: 'Third floor' }
      },

      /* --- Payment plans: Najm's own posts ("Payment Plans" in the Drive
         folder), with THE RULE NAJM CONFIRMED ON 2026-11-03 (Muhanad, after a
         call with Najm): instalments every 3 months, the first 3 months after
         the down payment; the down payment is a share of the ORIGINAL price;
         the plan's discount is taken off what is left after it (planTerms
         discountOn 'balance'). Maintenance 8% of the original price, 6 months
         before delivery; delivery 3.5 years from the contract.
         THE FOUR PLANS, Muhanad 2026-11-14 ("remove any other payments"):
         10% 7y dis. 10% · 15% 8y dis. 10% · 20% 9y dis. 10% · Cash 40%.
         Semi cash, the pharmacy offer and the hypermarket offer are gone;
         every unit, the pharmacy too, takes these four. Cash = one payment on
         signing (ASSUMED, never answered).
         MEDICAL ZONE SHARES, their own two plans (Muhanad, 2026-11-15, from Najm:
         "250k down + 10k a month" and "150k down + 15k a month" on a 1,000,000
         share; then his answers the same day): the first instalment 3 months
         after the contract and then every 3 months (30,000 or 45,000 a share);
         per share (2 shares = twice each amount); no discount; no maintenance.
         Written as shares of the price so several shares scale: 25% down, 3% a
         quarter, 25 instalments to month 75; 15% down, 4.5% a quarter, 18 x
         45,000 and a LAST 40,000 (his yes) to month 57. `months` is checked by
         js/plans.js against the count it derives from the amounts. */
      plans: [
        { id: 'p10-7',  group: 'plans', label: '10% down · 7 years · 10% off', down: 0.10, years: 7, every: 3, discount: 0.10 },
        { id: 'p15-8',  group: 'plans', label: '15% down · 8 years · 10% off', down: 0.15, years: 8, every: 3, discount: 0.10 },
        { id: 'p20-9',  group: 'plans', label: '20% down · 9 years · 10% off', down: 0.20, years: 9, every: 3, discount: 0.10 },
        { id: 'cash',   group: 'cash',  label: 'Cash · 40% off', cash: true, discount: 0.40 },
        { id: 'z25',    group: 'zone',  only: 'zone', label: '25% down · 6 years 3 months', down: 0.25, each: 0.03,  months: 75, every: 3, discount: 0, maintenance: false },
        { id: 'z15',    group: 'zone',  only: 'zone', label: '15% down · 4 years 9 months', down: 0.15, each: 0.045, months: 57, every: 3, discount: 0, maintenance: false }
      ],
      planGroups: { plans: 'Payment plans', cash: 'Cash', zone: 'Zone share plans' },
      planTerms: {
        instalmentEvery: 3, downOn: 'list', discountOn: 'balance', deliveryMonths: 42,
        maintenance: { pct: 0.08, on: 'list', dueMonthsBeforeDelivery: 6, label: 'Maintenance' }
      },
      /* kinds whose plans Najm has not confirmed: shown, never offered (none today:
         the zone shares' two plans came on 2026-11-15) */
      hold: {},

      /* the lines, in the order of the building, from the street up */
      lines: [
        {
          id: 'commercial', name: 'Commercial', kind: 'Shops',
          floors: ['ground', 'first'],
          /* Find a unit: this line's own questions (js/finder.js), from the whole project
             on the final plans, what is sold out shown dimmed. */
          filters: {
            floors: ['ground', 'first'],
            sizes: [
              { id: 'c40', label: 'Up to 40 m²', lo: 0, hi: 40 },
              { id: 'c60', label: '41–60 m²', lo: 40, hi: 60 },
              { id: 'c80', label: '61–80 m²', lo: 60, hi: 80 },
              { id: 'cmax', label: 'Over 80 m²', lo: 80, hi: Infinity }
            ],
            facets: [
              { id: 'kind', label: 'Type', column: 'kindWord',
                options: [{ id: 'shop', label: 'Shop', words: ['shop'] }, { id: 'pharmacy', label: 'Pharmacy', words: ['pharmacy'] }] },
              { id: 'out', label: 'Outdoor', column: 'outdoor', positive: 'with', otherwise: 'none',
                options: [{ id: 'with', label: 'With outdoor' }, { id: 'none', label: 'Indoor only' }] }
            ]
          },
          pic: 'img/line-commercial.jpg',
          facts: [
            { k: 'Delivered', v: 'Core & shell' }
          ]
        },
        {
          id: 'admin', name: 'Administrative', kind: 'Offices',
          floors: ['second'],
          filters: {
            floors: ['second'],
            sizes: [
              { id: 'o40', label: 'Up to 40 m²', lo: 0, hi: 40 },
              { id: 'o60', label: '41–60 m²', lo: 40, hi: 60 },
              { id: 'o80', label: '61–80 m²', lo: 60, hi: 80 }
            ]
          },
          pic: 'img/line-admin.jpg',
          facts: [
            { k: 'Delivered', v: 'Fully finished with AC' }
          ]
        },
        {
          id: 'medical', name: 'Medical', kind: 'Clinics',
          floors: ['third'],
          filters: {
            floors: ['third'],
            sizes: [
              { id: 'm25', label: 'Up to 25 m²', lo: 0, hi: 25 },
              { id: 'm35', label: '26–35 m²', lo: 25, hi: 35 },
              { id: 'mmax', label: 'Over 35 m²', lo: 35, hi: Infinity }
            ],
            facets: [
              { id: 'kind', label: 'Type', column: 'kindWord',
                options: [{ id: 'clinic', label: 'Clinic', words: ['clinic'] }, { id: 'zone', label: 'Zone share', words: ['zone'] }] }
            ]
          },
          pic: 'img/line-medical.jpg',
          operator: 'Operated by Healthy Care Medical Group',
          facts: [
            { k: 'Delivered', v: 'Fully finished with AC' }
          ]
        }
      ]
    }
  ]
};
