/**
 * EU Annex III fragrance allergens requiring individual labelling.
 *
 * Transcribed from the full text of Commission Regulation (EU) 2023/1545 of 26 July 2023
 * (OJ L 188, 27.7.2023, p. 1), amending Annex III to Regulation (EC) No 1223/2009.
 * CELEX:32023R1545. Entry into force 2023-08-16.
 *
 * Coverage and its limits (rubric doc Section 2c) — read before trusting this file:
 *
 *   COVERED   entries 45, 46, 70, 73, 86, 88, 109, 114, 122, 124, 131, 133, 154, 157,
 *             175, 196, 324  (17 substituted by 2023/1545)
 *   COVERED   entries 327-371 (45 added by 2023/1545)
 *   COVERED   entries 67-92 (19 pre-existing allergens, from the consolidated Annex III)
 *   DELETED   entries 68, 79, 83 carry no substance and must never be seeded
 *
 *   (historic note) the pre-existing allergens in entries 67-92 that 2023/1545 did not
 *             substitute — e.g. Linalool, Geraniol, Eugenol, Coumarin, Cinnamal.
 *             Recital 5 confirms they exist ("entries 45 and 67 to 92") but an amending
 *             act only reproduces what it changes, so their wording lives only in the
 *             consolidated Annex III (CELEX:02009R1223). Do not add them from memory.
 *   DELETED   entries 125, 126, 158, 160-163, 165, 167, 168 are repealed — never seed.
 *
 * Corrigenda: 32023R1545R(01) (2024-08-16, Slovak only) and 32023R1545R(02)
 * (2025-11-07, language scope unstated). R(02) has NOT been checked against this
 * transcription — verify before citing the dataset as final.
 */

export type RiskCategory =
  | 'fragrance_allergen'
  | 'preservative_sensitizer'
  | 'comedogenic'
  | 'common_irritant'
  | 'photosensitizing';

export type CuratedRiskEntry = {
  /** Name the regulation requires on the label; grouped entries use their collective name. */
  inciName: string;
  /** Other Common Ingredients Glossary names covered by the same Annex III entry. */
  aliases: string[];
  riskCategory: RiskCategory;
  /** Annex III reference number, or 0 where no numbered provision applies. */
  annexEntry: number;
  casNumbers: string[];
  ecNumbers: string[];
  sourceCitation: string;
  notes?: string;
};

/** Article 19(1)(g) disclosure thresholds, identical for every entry below. */
export const FRAGRANCE_ALLERGEN_THRESHOLDS = {
  leaveOnPercent: 0.001,
  rinseOffPercent: 0.01,
} as const;

/**
 * Compliance is still phasing in, so a product on sale today may legally omit these
 * declarations. An absent allergen is therefore not evidence of absence.
 */
export const LABELLING_TRANSITION = {
  placedOnMarketUntil: '2026-07-31',
  madeAvailableUntil: '2028-07-31',
} as const;

const SUBSTITUTED = (entry: number) =>
  `Regulation (EC) No 1223/2009, Annex III entry ${entry}, as substituted by Commission Regulation (EU) 2023/1545 (OJ L 188, 27.7.2023, p. 1)`;

const PRE_EXISTING = (entry: number) =>
  `Regulation (EC) No 1223/2009, Annex III entry ${entry} (consolidated text, CELEX:02009R1223)`;

const ADDED = (entry: number) =>
  `Regulation (EC) No 1223/2009, Annex III entry ${entry}, as added by Commission Regulation (EU) 2023/1545 (OJ L 188, 27.7.2023, p. 1)`;

/** Entries 2023/1545 substituted. */
export const substitutedFragranceAllergens: CuratedRiskEntry[] = [
  {
    inciName: 'Benzyl Alcohol',
    aliases: [],
    riskCategory: 'fragrance_allergen',
    annexEntry: 45,
    casNumbers: ['100-51-6'],
    ecNumbers: ['202-859-9'],
    sourceCitation: SUBSTITUTED(45),
    notes: 'Applies only when used for purposes other than inhibiting microorganism growth.',
  },
  {
    inciName: '6-Methyl Coumarin',
    aliases: [],
    riskCategory: 'fragrance_allergen',
    annexEntry: 46,
    casNumbers: ['92-48-8'],
    ecNumbers: ['202-158-8'],
    sourceCitation: SUBSTITUTED(46),
    notes: 'Oral products only, max 0,003 %.',
  },
  {
    inciName: 'Citral',
    aliases: ['Geranial', 'Neral'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 70,
    casNumbers: ['5392-40-5', '141-27-5', '106-26-3'],
    ecNumbers: ['226-394-6', '205-476-5', '203-379-2'],
    sourceCitation: SUBSTITUTED(70),
    notes: "Must be declared collectively as 'Citral'.",
  },
  {
    inciName: 'Isoeugenol',
    aliases: ['trans-Isoeugenol', 'cis-Isoeugenol'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 73,
    casNumbers: ['97-54-1', '5932-68-3', '5912-86-7'],
    ecNumbers: ['202-590-7', '227-678-2', '227-633-7'],
    sourceCitation: SUBSTITUTED(73),
    notes: 'Max 0,02 % in products other than oral products.',
  },
  {
    inciName: 'Citronellol',
    aliases: ['(3R)-3,7-dimethyloct-6-en-1-ol', '(3S)-3,7-dimethyloct-6-en-1-ol'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 86,
    casNumbers: ['106-22-9', '26489-01-0', '1117-61-9', '7540-51-4'],
    ecNumbers: ['203-375-0', '247-737-6', '214-250-5', '231-415-7'],
    sourceCitation: SUBSTITUTED(86),
  },
  {
    inciName: 'Limonene',
    aliases: ['d-Limonene', 'l-Limonene', 'Dipentene'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 88,
    casNumbers: ['138-86-3', '7705-14-8', '5989-27-5', '5989-54-8'],
    ecNumbers: ['205-341-0', '231-732-0', '227-813-5', '227-815-6'],
    sourceCitation: SUBSTITUTED(88),
    notes: 'Peroxide value for each substance must be below 20 mmoles/L.',
  },
  {
    inciName: 'Pinus Mugo',
    aliases: ['Pinus Mugo Leaf Oil', 'Pinus Mugo Twig Leaf Extract', 'Pinus Mugo Twig Oil'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 109,
    casNumbers: ['90082-72-7'],
    ecNumbers: ['290-163-6'],
    sourceCitation: SUBSTITUTED(109),
    notes: 'Peroxide value below 10 mmoles/L.',
  },
  {
    inciName: 'Pinus Pumila',
    aliases: [
      'Pinus Pumila Needle Extract',
      'Pinus Pumila Twig Leaf Extract',
      'Pinus Pumila Twig Leaf Oil',
    ],
    riskCategory: 'fragrance_allergen',
    annexEntry: 114,
    casNumbers: ['97676-05-6'],
    ecNumbers: ['307-681-6'],
    sourceCitation: SUBSTITUTED(114),
    notes: 'Peroxide value below 10 mmoles/L.',
  },
  {
    inciName: 'Cedrus Atlantica Oil/Extract',
    aliases: [
      'Cedrus Atlantica Bark Extract',
      'Cedrus Atlantica Bark Oil',
      'Cedrus Atlantica Bark Water',
      'Cedrus Atlantica Leaf Extract',
      'Cedrus Atlantica Wood Extract',
      'Cedrus Atlantica Wood Oil',
    ],
    riskCategory: 'fragrance_allergen',
    annexEntry: 122,
    casNumbers: ['92201-55-3', '8023-85-6'],
    ecNumbers: ['295-985-9'],
    sourceCitation: SUBSTITUTED(122),
    notes: 'Peroxide value below 10 mmoles/L.',
  },
  {
    inciName: 'Turpentine',
    aliases: ['Turpentine gum', 'Turpentine oil and rectified oil', 'Turpentine, steam distilled'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 124,
    casNumbers: ['9005-90-7', '8006-64-2', '8052-14-0'],
    ecNumbers: ['232-688-5', '232-350-7'],
    sourceCitation: SUBSTITUTED(124),
    notes: 'Peroxide value for each substance below 10 mmoles/L.',
  },
  {
    inciName: 'Alpha-Terpinene',
    aliases: [],
    riskCategory: 'fragrance_allergen',
    annexEntry: 131,
    casNumbers: ['99-86-5'],
    ecNumbers: ['202-795-1'],
    sourceCitation: SUBSTITUTED(131),
    notes: 'Peroxide value below 10 mmoles/L.',
  },
  {
    inciName: 'Terpinolene',
    aliases: [],
    riskCategory: 'fragrance_allergen',
    annexEntry: 133,
    casNumbers: ['586-62-9'],
    ecNumbers: ['209-578-0'],
    sourceCitation: SUBSTITUTED(133),
    notes: 'Peroxide value below 10 mmoles/L.',
  },
  {
    inciName: 'Myroxylon Pereirae Oil/Extract',
    aliases: [
      'Myroxylon Balsamum Pereirae Balsam Extract',
      'Myroxylon Balsamum Pereirae Balsam Oil',
      'Myroxylon Pereirae Oil',
      'Myroxylon Pereirae Resin Extract',
      'Myroxylon Pereirae Resin',
      'Balsam Peru',
    ],
    riskCategory: 'fragrance_allergen',
    annexEntry: 154,
    casNumbers: ['8007-00-9'],
    ecNumbers: ['232-352-8'],
    sourceCitation: SUBSTITUTED(154),
    notes: 'Max 0,4 % in ready for use preparation.',
  },
  {
    inciName: 'Rose Ketones',
    aliases: [
      'Alpha-Damascone',
      'cis-Rose ketone 1',
      'trans-Rose ketone 1',
      'Rose ketone 4',
      'Damascone',
      'Rose ketone 3',
      'delta-Damascone',
      'trans-Rose ketone 3',
      'cis-Rose ketone 2',
      'cis-beta-Damascone',
      'trans-Rose ketone 2',
      'trans-beta-Damascone',
    ],
    riskCategory: 'fragrance_allergen',
    annexEntry: 157,
    casNumbers: [
      '43052-87-5',
      '23726-94-5',
      '24720-09-0',
      '23696-85-7',
      '57378-68-4',
      '71048-82-3',
      '23726-92-3',
      '23726-91-2',
    ],
    ecNumbers: [
      '245-845-8',
      '246-430-4',
      '245-833-2',
      '260-709-8',
      '275-156-8',
      '245-843-7',
      '245-842-1',
    ],
    sourceCitation: SUBSTITUTED(157),
    notes: 'Max 0,02 % outside oral products.',
  },
  {
    inciName: '3-Propylidenephthalide',
    aliases: ['3-Propylidene-1(3H)-isobenzofuranone'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 175,
    casNumbers: ['17369-59-4'],
    ecNumbers: ['241-402-8'],
    sourceCitation: SUBSTITUTED(175),
    notes: 'Max 0,01 % in products other than oral products.',
  },
  {
    inciName: 'Lippia citriodora absolute',
    aliases: ['Verbena absolute'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 196,
    casNumbers: ['8024-12-2', '85116-63-8'],
    ecNumbers: ['285-515-0'],
    sourceCitation: SUBSTITUTED(196),
    notes: 'Max 0,2 %. Verbena essential oils are prohibited under Annex II No 450.',
  },
  {
    inciName: 'Methyl Salicylate',
    aliases: ['Methyl 2-hydroxybenzoate'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 324,
    casNumbers: ['119-36-8'],
    ecNumbers: ['204-317-7'],
    sourceCitation: SUBSTITUTED(324),
    notes:
      'Extensive per-product-type limits. Not permitted for children under 6 except toothpaste.',
  },
];

/** Entries 327-371, added following SCCS opinion SCCS/1459/11. */
export const addedFragranceAllergens: CuratedRiskEntry[] = [
  {
    inciName: 'Acetyl Cedrene',
    aliases: [],
    riskCategory: 'fragrance_allergen',
    annexEntry: 327,
    casNumbers: ['32388-55-9'],
    ecNumbers: ['251-020-3'],
    sourceCitation: ADDED(327),
  },
  {
    inciName: 'Amyl Salicylate',
    aliases: ['Pentyl-2-hydroxy-benzoate'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 328,
    casNumbers: ['2050-08-0'],
    ecNumbers: ['218-080-2'],
    sourceCitation: ADDED(328),
  },
  {
    inciName: 'Anethole',
    aliases: ['trans-Anethole'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 329,
    casNumbers: ['104-46-1', '4180-23-8'],
    ecNumbers: ['203-205-5', '224-052-0'],
    sourceCitation: ADDED(329),
  },
  {
    inciName: 'Benzaldehyde',
    aliases: [],
    riskCategory: 'fragrance_allergen',
    annexEntry: 330,
    casNumbers: ['100-52-7'],
    ecNumbers: ['202-860-4'],
    sourceCitation: ADDED(330),
  },
  {
    inciName: 'Camphor',
    aliases: ['Bornan-2-one'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 331,
    casNumbers: ['76-22-2', '21368-68-3', '464-49-3', '464-48-2'],
    ecNumbers: ['200-945-0', '244-350-4', '207-355-2', '207-354-7'],
    sourceCitation: ADDED(331),
  },
  {
    inciName: 'Beta-Caryophyllene',
    aliases: [],
    riskCategory: 'fragrance_allergen',
    annexEntry: 332,
    casNumbers: ['87-44-5'],
    ecNumbers: ['201-746-1'],
    sourceCitation: ADDED(332),
  },
  {
    inciName: 'Carvone',
    aliases: [],
    riskCategory: 'fragrance_allergen',
    annexEntry: 333,
    casNumbers: ['99-49-0', '6485-40-1', '2244-16-8'],
    ecNumbers: ['202-759-5', '229-352-5', '218-827-2'],
    sourceCitation: ADDED(333),
  },
  {
    inciName: 'Dimethyl Phenethyl Acetate',
    aliases: ['Dimethylbenzyl Carbinyl Acetate'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 334,
    casNumbers: ['151-05-3'],
    ecNumbers: ['205-781-3'],
    sourceCitation: ADDED(334),
  },
  {
    inciName: 'Hexadecanolactone',
    aliases: ['Oxacycloheptadecan-2-one'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 335,
    casNumbers: ['109-29-5'],
    ecNumbers: ['203-662-0'],
    sourceCitation: ADDED(335),
  },
  {
    inciName: 'Hexamethylindanopyran',
    aliases: [],
    riskCategory: 'fragrance_allergen',
    annexEntry: 336,
    casNumbers: ['1222-05-5'],
    ecNumbers: ['214-946-9'],
    sourceCitation: ADDED(336),
  },
  {
    inciName: 'Linalyl Acetate',
    aliases: [],
    riskCategory: 'fragrance_allergen',
    annexEntry: 337,
    casNumbers: ['115-95-7'],
    ecNumbers: ['204-116-4'],
    sourceCitation: ADDED(337),
  },
  {
    inciName: 'Menthol',
    aliases: ['dl-Menthol', 'l-Menthol', 'd-Menthol'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 338,
    casNumbers: ['89-78-1', '1490-04-6', '2216-51-5', '15356-60-2'],
    ecNumbers: ['201-939-0', '216-074-4', '218-690-9', '239-387-8'],
    sourceCitation: ADDED(338),
  },
  {
    inciName: 'Trimethylcyclopentenyl Methylisopentenol',
    aliases: [],
    riskCategory: 'fragrance_allergen',
    annexEntry: 339,
    casNumbers: ['67801-20-1'],
    ecNumbers: ['267-140-4'],
    sourceCitation: ADDED(339),
  },
  {
    inciName: 'Salicylaldehyde',
    aliases: ['o-Hydroxy-benzaldehyde'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 340,
    casNumbers: ['90-02-8'],
    ecNumbers: ['201-961-0'],
    sourceCitation: ADDED(340),
  },
  {
    inciName: 'Santalol',
    aliases: ['alpha-Santalol', 'beta-Santalol'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 341,
    casNumbers: ['11031-45-1', '115-71-9', '77-42-9'],
    ecNumbers: ['234-262-4', '204-102-8', '201-027-2'],
    sourceCitation: ADDED(341),
  },
  {
    inciName: 'Sclareol',
    aliases: [],
    riskCategory: 'fragrance_allergen',
    annexEntry: 342,
    casNumbers: ['515-03-7'],
    ecNumbers: ['208-194-0'],
    sourceCitation: ADDED(342),
  },
  {
    inciName: 'Terpineol',
    aliases: ['alpha-Terpineol', 'beta-Terpineol', 'gamma-Terpineol'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 343,
    casNumbers: ['8000-41-7', '98-55-5', '138-87-4', '586-81-2'],
    ecNumbers: ['232-268-1', '202-680-6', '205-342-6', '209-584-3'],
    sourceCitation: ADDED(343),
  },
  {
    inciName: 'Tetramethyl acetyloctahydronaphthalenes',
    aliases: [],
    riskCategory: 'fragrance_allergen',
    annexEntry: 344,
    casNumbers: ['54464-57-2', '54464-59-4', '68155-66-8', '68155-67-9'],
    ecNumbers: ['259-174-3', '259-175-9', '268-978-3', '268-979-9'],
    sourceCitation: ADDED(344),
  },
  {
    inciName: 'Trimethylbenzenepropanol',
    aliases: ['3-(2,2-Dimethyl-3-hydroxypropyl)toluene'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 345,
    casNumbers: ['103694-68-4'],
    ecNumbers: ['403-140-4'],
    sourceCitation: ADDED(345),
  },
  {
    inciName: 'Vanillin',
    aliases: ['4-Hydroxy-3-methoxybenzaldehyde'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 346,
    casNumbers: ['121-33-5'],
    ecNumbers: ['204-465-2'],
    sourceCitation: ADDED(346),
  },
  {
    inciName: 'Cananga Odorata Oil/Extract',
    aliases: ['Cananga Odorata Flower Extract', 'Cananga Odorata Flower Oil', 'Ylang Ylang'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 347,
    casNumbers: ['83863-30-3', '8006-81-3', '68606-83-7', '93686-30-7'],
    ecNumbers: ['281-092-1', '297-681-1'],
    sourceCitation: ADDED(347),
  },
  {
    inciName: 'Cinnamomum Cassia Leaf Oil',
    aliases: [],
    riskCategory: 'fragrance_allergen',
    annexEntry: 348,
    casNumbers: ['8007-80-5', '84961-46-6'],
    ecNumbers: ['284-635-0'],
    sourceCitation: ADDED(348),
  },
  {
    inciName: 'Cinnamomum Zeylanicum Bark Oil',
    aliases: [],
    riskCategory: 'fragrance_allergen',
    annexEntry: 349,
    casNumbers: ['8015-91-6', '84649-98-9'],
    ecNumbers: ['283-479-0'],
    sourceCitation: ADDED(349),
  },
  {
    inciName: 'Citrus Aurantium Flower Oil',
    aliases: ['Citrus Aurantium Amara Flower Oil', 'Citrus Aurantium Dulcis Flower Oil'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 350,
    casNumbers: ['72968-50-4', '8028-48-6', '8016-38-4'],
    ecNumbers: ['277-143-2', '232-433-8'],
    sourceCitation: ADDED(350),
  },
  {
    inciName: 'Citrus Aurantium Peel Oil',
    aliases: [
      'Citrus Aurantium Amara Peel Oil',
      'Citrus Aurantium Dulcis Peel Oil',
      'Citrus Sinensis Peel Oil',
    ],
    riskCategory: 'fragrance_allergen',
    annexEntry: 351,
    casNumbers: ['68916-04-1', '72968-50-4', '97766-30-8', '8028-48-6', '8008-57-9'],
    ecNumbers: ['277-143-2', '307-891-8', '232-433-8'],
    sourceCitation: ADDED(351),
  },
  {
    inciName: 'Citrus Aurantium Bergamia Peel Oil',
    aliases: ['Bergamot oil'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 352,
    casNumbers: ['8007-75-8', '89957-91-5', '68648-33-9', '85049-52-1'],
    ecNumbers: ['616-915-9', '289-612-9'],
    sourceCitation: ADDED(352),
  },
  {
    inciName: 'Citrus Limon Peel Oil',
    aliases: [],
    riskCategory: 'fragrance_allergen',
    annexEntry: 353,
    casNumbers: ['84929-31-7', '8008-56-8'],
    ecNumbers: ['284-515-8'],
    sourceCitation: ADDED(353),
  },
  {
    inciName: 'Lemongrass Oil',
    aliases: [
      'Cymbopogon Schoenanthus Oil',
      'Cymbopogon Flexuosus Oil',
      'Cymbopogon Citratus Leaf Oil',
    ],
    riskCategory: 'fragrance_allergen',
    annexEntry: 354,
    casNumbers: ['8007-02-1', '89998-16-3', '91844-92-7'],
    ecNumbers: ['289-754-1', '295-161-9'],
    sourceCitation: ADDED(354),
  },
  {
    inciName: 'Eucalyptus Globulus Oil',
    aliases: ['Eucalyptus Globulus Leaf Oil', 'Eucalyptus Globulus Leaf/Twig Oil'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 355,
    casNumbers: ['97926-40-4', '8000-48-4'],
    ecNumbers: ['308-257-3', '616-775-9'],
    sourceCitation: ADDED(355),
  },
  {
    inciName: 'Eugenia Caryophyllus Oil',
    aliases: [
      'Eugenia Caryophyllus Leaf Oil',
      'Eugenia Caryophyllus Flower Oil',
      'Eugenia Caryophyllus Stem Oil',
      'Eugenia Caryophyllus Bud Oil',
    ],
    riskCategory: 'fragrance_allergen',
    annexEntry: 356,
    casNumbers: ['8000-34-8', '8015-97-2', '84961-50-2'],
    ecNumbers: ['616-772-2', '284-638-7'],
    sourceCitation: ADDED(356),
  },
  {
    inciName: 'Jasmine Oil/Extract',
    aliases: [
      'Jasminum Grandiflorum Flower Extract',
      'Jasminum Officinale Oil',
      'Jasminum Officinale Flower Extract',
    ],
    riskCategory: 'fragrance_allergen',
    annexEntry: 357,
    casNumbers: ['84776-64-7', '90045-94-6', '8022-96-6', '8024-43-9'],
    ecNumbers: ['283-993-5', '289-960-1'],
    sourceCitation: ADDED(357),
  },
  {
    inciName: 'Juniperus Virginiana Oil',
    aliases: ['Juniperus Virginiana Wood Oil'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 358,
    casNumbers: ['8000-27-9', '85085-41-2'],
    ecNumbers: ['285-370-3'],
    sourceCitation: ADDED(358),
  },
  {
    inciName: 'Laurus Nobilis Leaf Oil',
    aliases: [],
    riskCategory: 'fragrance_allergen',
    annexEntry: 359,
    casNumbers: ['8002-41-3', '8007-48-5', '84603-73-6'],
    ecNumbers: ['283-272-5'],
    sourceCitation: ADDED(359),
    notes: 'Oil from the seeds of Laurus nobilis L. is prohibited under Annex II No 359.',
  },
  {
    inciName: 'Lavandula Oil/Extract',
    aliases: [
      'Lavandula Hybrida Oil',
      'Lavandula Hybrida Extract',
      'Lavandula Hybrida Flower Extract',
      'Lavandula Intermedia Flower/Leaf/Stem Extract',
      'Lavandula Intermedia Flower/Leaf/Stem Oil',
      'Lavandula Intermedia Oil',
      'Lavandula Angustifolia Oil',
      'Lavandula Angustifolia Flower/Leaf/Stem Extract',
    ],
    riskCategory: 'fragrance_allergen',
    annexEntry: 360,
    casNumbers: [
      '91722-69-9',
      '8022-15-9',
      '93455-96-0',
      '93455-97-1',
      '92623-76-2',
      '84776-65-8',
      '8000-28-0',
      '90063-37-9',
    ],
    ecNumbers: ['294-470-6', '296-408-3', '283-994-0', '289-995-2'],
    sourceCitation: ADDED(360),
  },
  {
    inciName: 'Mentha Piperita Oil',
    aliases: ['Peppermint oil'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 361,
    casNumbers: ['8006-90-4', '84082-70-2'],
    ecNumbers: ['282-015-4'],
    sourceCitation: ADDED(361),
  },
  {
    inciName: 'Mentha Viridis Leaf Oil',
    aliases: ['Mentha spicata oil', 'Spearmint oil'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 362,
    casNumbers: ['8008-79-5', '84696-51-5'],
    ecNumbers: ['616-927-4', '283-656-2'],
    sourceCitation: ADDED(362),
  },
  {
    inciName: 'Narcissus Extract',
    aliases: [
      'Narcissus Poeticus Extract',
      'Narcissus Pseudonarcissus Flower Extract',
      'Narcissus Jonquilla Extract',
      'Narcissus Tazetta Extract',
    ],
    riskCategory: 'fragrance_allergen',
    annexEntry: 363,
    casNumbers: ['90064-26-9', '68917-12-4', '90064-27-0', '90064-25-8'],
    ecNumbers: ['290-087-3', '290-088-9', '290-086-8'],
    sourceCitation: ADDED(363),
  },
  {
    inciName: 'Pelargonium Graveolens Flower Oil',
    aliases: [],
    riskCategory: 'fragrance_allergen',
    annexEntry: 364,
    casNumbers: ['90082-51-2', '8000-46-2'],
    ecNumbers: ['290-140-0'],
    sourceCitation: ADDED(364),
  },
  {
    inciName: 'Pogostemon Cablin Oil',
    aliases: ['Patchouli oil'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 365,
    casNumbers: ['8014-09-3', '84238-39-1'],
    ecNumbers: ['282-493-4'],
    sourceCitation: ADDED(365),
  },
  {
    inciName: 'Rose Flower Oil/Extract',
    aliases: [
      'Rosa Damascena Flower Oil',
      'Rosa Damascena Flower Extract',
      'Rosa Alba Flower Oil',
      'Rosa Alba Flower Extract',
      'Rosa Canina Flower Oil',
      'Rosa Centifolia Flower Oil',
      'Rosa Centifolia Flower Extract',
      'Rosa Gallica Flower Oil',
      'Rosa Moschata Flower Oil',
      'Rosa Rugosa Flower Oil',
    ],
    riskCategory: 'fragrance_allergen',
    annexEntry: 366,
    casNumbers: [
      '8007-01-0',
      '90106-38-0',
      '93334-48-6',
      '84696-47-9',
      '84604-12-6',
      '84604-13-7',
      '92347-25-6',
    ],
    ecNumbers: ['290-260-3', '297-122-1', '283-652-0', '283-289-8', '283-290-3', '296-213-3'],
    sourceCitation: ADDED(366),
  },
  {
    inciName: 'Santalum Album Oil',
    aliases: ['Sandalwood oil'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 367,
    casNumbers: ['8006-87-9', '84787-70-2'],
    ecNumbers: ['284-111-1'],
    sourceCitation: ADDED(367),
  },
  {
    inciName: 'Eugenyl Acetate',
    aliases: [],
    riskCategory: 'fragrance_allergen',
    annexEntry: 368,
    casNumbers: ['93-28-7'],
    ecNumbers: ['202-235-6'],
    sourceCitation: ADDED(368),
  },
  {
    inciName: 'Geranyl Acetate',
    aliases: [],
    riskCategory: 'fragrance_allergen',
    annexEntry: 369,
    casNumbers: ['105-87-3'],
    ecNumbers: ['203-341-5'],
    sourceCitation: ADDED(369),
  },
  {
    inciName: 'Isoeugenyl Acetate',
    aliases: [],
    riskCategory: 'fragrance_allergen',
    annexEntry: 370,
    casNumbers: ['93-29-8'],
    ecNumbers: ['202-236-1'],
    sourceCitation: ADDED(370),
  },
  {
    inciName: 'Pinene',
    aliases: ['alpha-Pinene', 'beta-Pinene'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 371,
    casNumbers: ['80-56-8', '7785-70-8', '127-91-3', '18172-67-3'],
    ecNumbers: ['201-291-9', '232-087-8', '204-872-5', '242-060-2'],
    sourceCitation: ADDED(371),
    notes: 'Monoterpene, so also subject to the peroxide value restriction in entry 130.',
  },
];

/**
 * Entries 67-92 as they stand in the consolidated Annex III. These are the long-standing
 * individually-labelled fragrance allergens; 2023/1545 left them untouched, so an amending
 * act never reproduced them and they had to be taken from the consolidated text.
 *
 * Reference numbers 68, 79 and 83 are deliberately absent — see deletedFragranceAllergenEntries.
 * Numbers 70, 73, 86 and 88 also fall in this range but were substituted by 2023/1545 and so
 * live in substitutedFragranceAllergens above.
 */
export const preExistingFragranceAllergens: CuratedRiskEntry[] = [
  {
    inciName: 'Amyl Cinnamal',
    aliases: ['2-Benzylideneheptanal'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 67,
    casNumbers: ['122-40-7'],
    ecNumbers: ['204-541-5'],
    sourceCitation: PRE_EXISTING(67),
  },
  {
    inciName: 'Cinnamyl Alcohol',
    aliases: [],
    riskCategory: 'fragrance_allergen',
    annexEntry: 69,
    casNumbers: ['104-54-1'],
    ecNumbers: ['203-212-3'],
    sourceCitation: PRE_EXISTING(69),
  },
  {
    inciName: 'Eugenol',
    aliases: ['Phenol, 2-methoxy-4-(2-propenyl)'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 71,
    casNumbers: ['97-53-0'],
    ecNumbers: ['202-589-1'],
    sourceCitation: PRE_EXISTING(71),
  },
  {
    inciName: 'Hydroxycitronellal',
    aliases: ['7-Hydroxycitronellal'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 72,
    casNumbers: ['107-75-5'],
    ecNumbers: ['203-518-7'],
    sourceCitation: PRE_EXISTING(72),
    notes: 'Max 1,0 % outside oral products.',
  },
  {
    inciName: 'Amylcinnamyl Alcohol',
    aliases: ['2-Pentyl-3-phenylprop-2-en-1-ol'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 74,
    casNumbers: ['101-85-9'],
    ecNumbers: ['202-982-8'],
    sourceCitation: PRE_EXISTING(74),
  },
  {
    inciName: 'Benzyl Salicylate',
    aliases: [],
    riskCategory: 'fragrance_allergen',
    annexEntry: 75,
    casNumbers: ['118-58-1'],
    ecNumbers: ['204-262-9'],
    sourceCitation: PRE_EXISTING(75),
  },
  {
    inciName: 'Cinnamal',
    aliases: ['2-Propenal, 3-phenyl-'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 76,
    casNumbers: ['104-55-2'],
    ecNumbers: ['203-213-9'],
    sourceCitation: PRE_EXISTING(76),
  },
  {
    inciName: 'Coumarin',
    aliases: ['2H-1-Benzopyran-2-one'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 77,
    casNumbers: ['91-64-5'],
    ecNumbers: ['202-086-7'],
    sourceCitation: PRE_EXISTING(77),
  },
  {
    inciName: 'Geraniol',
    aliases: [],
    riskCategory: 'fragrance_allergen',
    annexEntry: 78,
    casNumbers: ['106-24-1'],
    ecNumbers: ['203-377-1'],
    sourceCitation: PRE_EXISTING(78),
  },
  {
    inciName: 'Anise Alcohol',
    aliases: ['4-Methoxybenzyl alcohol'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 80,
    casNumbers: ['105-13-5'],
    ecNumbers: ['203-273-6'],
    sourceCitation: PRE_EXISTING(80),
  },
  {
    inciName: 'Benzyl Cinnamate',
    aliases: [],
    riskCategory: 'fragrance_allergen',
    annexEntry: 81,
    casNumbers: ['103-41-3'],
    ecNumbers: ['203-109-3'],
    sourceCitation: PRE_EXISTING(81),
  },
  {
    inciName: 'Farnesol',
    aliases: [],
    riskCategory: 'fragrance_allergen',
    annexEntry: 82,
    casNumbers: ['4602-84-0'],
    ecNumbers: ['225-004-1'],
    sourceCitation: PRE_EXISTING(82),
  },
  {
    inciName: 'Linalool',
    aliases: ['1,6-Octadien-3-ol, 3,7-dimethyl-'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 84,
    casNumbers: ['78-70-6'],
    ecNumbers: ['201-134-4'],
    sourceCitation: PRE_EXISTING(84),
    notes: 'Most frequent fragrance allergen in the test corpus (295 of 1 299 products).',
  },
  {
    inciName: 'Benzyl Benzoate',
    aliases: [],
    riskCategory: 'fragrance_allergen',
    annexEntry: 85,
    casNumbers: ['120-51-4'],
    ecNumbers: ['204-402-9'],
    sourceCitation: PRE_EXISTING(85),
  },
  {
    inciName: 'Hexyl Cinnamal',
    aliases: ['2-Benzylideneoctanal'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 87,
    casNumbers: ['101-86-0'],
    ecNumbers: ['202-983-3'],
    sourceCitation: PRE_EXISTING(87),
  },
  {
    inciName: 'Methyl 2-Octynoate',
    aliases: ['Methyl Oct-2-ynoate', 'Methyl heptine carbonate'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 89,
    casNumbers: ['111-12-6'],
    ecNumbers: ['203-836-6'],
    sourceCitation: PRE_EXISTING(89),
    notes: 'Max 0,01 % alone; combined with methyl octine carbonate also 0,01 %.',
  },
  {
    inciName: 'Alpha-Isomethyl Ionone',
    aliases: [],
    riskCategory: 'fragrance_allergen',
    annexEntry: 90,
    casNumbers: ['127-51-5'],
    ecNumbers: ['204-846-3'],
    sourceCitation: PRE_EXISTING(90),
  },
  {
    inciName: 'Evernia Prunastri Extract',
    aliases: ['Oak moss extract'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 91,
    casNumbers: ['90028-68-5'],
    ecNumbers: ['289-861-3'],
    sourceCitation: PRE_EXISTING(91),
    notes: 'Atranol and chloroatranol, its sensitising constituents, are prohibited outright.',
  },
  {
    inciName: 'Evernia Furfuracea Extract',
    aliases: ['Treemoss extract'],
    riskCategory: 'fragrance_allergen',
    annexEntry: 92,
    casNumbers: ['90028-67-4'],
    ecNumbers: ['289-860-8'],
    sourceCitation: PRE_EXISTING(92),
    notes: 'Atranol and chloroatranol, its sensitising constituents, are prohibited outright.',
  },
];

/**
 * Reference numbers inside 67-92 that the consolidated Annex III shows as struck out.
 * Seeding any of these as a restricted allergen would be a correctness error: two of them
 * are no longer restricted but PROHIBITED, which is a stronger status, not a weaker one.
 */
export const deletedFragranceAllergenEntries: ReadonlyArray<{
  annexEntry: number;
  amendmentMarker: string;
  reason: string;
}> = [
  {
    annexEntry: 68,
    amendmentMarker: 'M1',
    reason: 'Benzyl alcohol; its labelling obligation is now carried by Annex III entry 45.',
  },
  {
    annexEntry: 79,
    amendmentMarker: 'M23',
    reason:
      'HICC (hydroxyisohexyl 3-cyclohexene carboxaldehyde); moved to Annex II entry 1380 and prohibited.',
  },
  {
    annexEntry: 83,
    amendmentMarker: 'M42',
    reason:
      'Butylphenyl Methylpropional (Lilial). It appears nowhere in the current Annex III, so it must not be scored as a restricted allergen. Present in 49 of 1 299 corpus products.',
  },
];

/**
 * Substances whose CAS number appears in BOTH Annex III and Annex II, because the annexes
 * regulate different preparations of the same source material. The regulation itself
 * cross-references each pair, so these are not transcription errors and the scoring engine
 * must not collapse them.
 */
export const dualStatusSubstances: ReadonlyArray<{
  casNumber: string;
  annexIIIEntry: number;
  annexIIEntry: number;
  distinction: string;
}> = [
  {
    casNumber: '8007-00-9',
    annexIIIEntry: 154,
    annexIIEntry: 1136,
    distinction:
      'Myroxylon pereirae extracts and distillates are restricted to 0,4 %; the crude exudation (Peru balsam) is prohibited.',
  },
  {
    casNumber: '8024-12-2',
    annexIIIEntry: 196,
    annexIIEntry: 450,
    distinction:
      'Verbena absolute is restricted to 0,2 %; verbena essential oils and other derivatives are prohibited. Annex III footnote 39 makes the cross-reference explicit.',
  },
];

export const curatedFragranceAllergens: CuratedRiskEntry[] = [
  ...substitutedFragranceAllergens,
  ...addedFragranceAllergens,
  ...preExistingFragranceAllergens,
];

/** Annex III entries repealed by 2023/1545, so the seeder can assert it never revives one. */
export const repealedAnnexEntries: readonly number[] = [
  125, 126, 158, 160, 161, 162, 163, 165, 167, 168,
];

/**
 * Preservative sensitizers. Unlike the fragrance allergens above these are not tied to a
 * numbered provision — "FDA cosmetic ingredient guidance" is too vague to defend in the
 * report and must be replaced with a citable document per entry before Phase 5.
 */
export const curatedPreservativeSensitizers: CuratedRiskEntry[] = [
  {
    inciName: 'Methylisothiazolinone',
    aliases: ['MI', 'MIT'],
    riskCategory: 'preservative_sensitizer',
    annexEntry: 0,
    casNumbers: ['2682-20-4'],
    ecNumbers: ['220-239-6'],
    sourceCitation: 'FDA cosmetic ingredient guidance — CITATION INCOMPLETE, see rubric doc §6',
    notes: 'Documented contact sensitizer, restricted concentration in leave-on products',
  },
  {
    inciName: 'DMDM Hydantoin',
    aliases: [],
    riskCategory: 'preservative_sensitizer',
    annexEntry: 0,
    casNumbers: ['6440-58-0'],
    ecNumbers: ['229-222-8'],
    sourceCitation: 'FDA cosmetic ingredient guidance — CITATION INCOMPLETE, see rubric doc §6',
    notes: 'Formaldehyde-releaser',
  },
  {
    inciName: 'Quaternium-15',
    aliases: [],
    riskCategory: 'preservative_sensitizer',
    annexEntry: 0,
    casNumbers: ['4080-31-3'],
    ecNumbers: ['223-805-0'],
    sourceCitation: 'FDA cosmetic ingredient guidance — CITATION INCOMPLETE, see rubric doc §6',
    notes: 'Formaldehyde-releaser',
  },
];

/**
 * Comedogenic ingredients.
 *
 * This is the weakest-evidence dataset in the project and must be read with that in mind.
 * There is no regulatory source: no Annex of Regulation (EC) No 1223/2009 mentions
 * comedogenicity at all. The evidence is the rabbit-ear assay literature, and its authors
 * are candid about the model — Fulton (1984) calls it "not an ideal animal model but is the
 * best we have".
 *
 * The decisive caveat comes from Draelos ZD, DiNardo JC, "A re-evaluation of the
 * comedogenicity concept", J Am Acad Dermatol. 2006;54(3):507-512,
 * doi:10.1016/j.jaad.2005.11.1058 (PMID 16488305), which tested finished products in humans
 * and concluded: "Finished products using comedogenic ingredients are not necessarily
 * comedogenic." A comedogenic ingredient on a label is therefore evidence about the raw
 * material, not a prediction about the product. Scoring must never escalate on it alone;
 * `comedogenic` is deliberately absent from REGULATION_BACKED_CATEGORIES so rule 3 cannot
 * raise it to Avoid.
 *
 * `casNumbers` is empty throughout on purpose. Both source papers identify materials by
 * ingredient name, not by CAS, so asserting a CAS here would claim a precision the citation
 * does not carry. Matching is by INCI name and alias.
 *
 * NOT TRANSCRIBED: Fulton (1984) also reports every D&C Red dye tested as comedogenic. Those
 * are US color-additive designations with no clean one-to-one mapping to the EU CI numbers a
 * European label carries, so they are omitted rather than guessed at.
 */

const NGUYEN_2007 =
  'Nguyen SH, Dang TP, Maibach HI. Comedogenicity in rabbit: some cosmetic ingredients/vehicles. Cutan Ocul Toxicol. 2007;26(4):287-292. doi:10.1080/15569520701555383 (PMID 18058303)';

const FULTON_1984 =
  'Fulton JE Jr, Pay SR, Fulton JE 3rd. Comedogenicity of current therapeutic products, cosmetics, and ingredients in the rabbit ear. J Am Acad Dermatol. 1984;10(1):96-105. doi:10.1016/s0190-9622(84)80050-x (PMID 6229554)';

const comedogenic = (
  inciName: string,
  aliases: string[],
  refs: string[],
  notes: string,
): CuratedRiskEntry => ({
  inciName,
  aliases,
  riskCategory: 'comedogenic',
  annexEntry: 0,
  casNumbers: [],
  ecNumbers: [],
  sourceCitation: refs.join(' | '),
  notes,
});

export const curatedComedogenicIngredients: CuratedRiskEntry[] = [
  comedogenic(
    'Isopropyl Myristate',
    ['IPM'],
    [NGUYEN_2007, FULTON_1984],
    'Positive in both studies; Fulton treats it as the reference offender of this class.',
  ),
  comedogenic('Isopropyl Palmitate', ['IPP'], [NGUYEN_2007, FULTON_1984], 'Positive in both.'),
  comedogenic('Isopropyl Isostearate', [], [NGUYEN_2007, FULTON_1984], 'Positive in both.'),
  comedogenic('Butyl Stearate', [], [NGUYEN_2007, FULTON_1984], 'Positive in both.'),
  comedogenic('Decyl Oleate', [], [NGUYEN_2007, FULTON_1984], 'Positive in both.'),
  comedogenic('Isostearyl Neopentanoate', [], [NGUYEN_2007, FULTON_1984], 'Positive in both.'),
  comedogenic('Isocetyl Stearate', [], [NGUYEN_2007, FULTON_1984], 'Positive in both.'),
  comedogenic('Myristyl Myristate', [], [NGUYEN_2007, FULTON_1984], 'Positive in both.'),
  comedogenic(
    'Theobroma Cacao (Cocoa) Seed Butter',
    ['Cocoa Butter'],
    [NGUYEN_2007],
    'Reported as cocoa butter; listed here under the INCI name a label would carry.',
  ),
  comedogenic(
    'Ethylhexyl Stearate',
    ['Octyl Stearate'],
    [FULTON_1984],
    'Fulton names it octyl stearate, the former INCI name for the same ester.',
  ),
  comedogenic(
    'Ethylhexyl Palmitate',
    ['Octyl Palmitate'],
    [FULTON_1984],
    'Fulton names it octyl palmitate, the former INCI name for the same ester.',
  ),
  comedogenic('PPG-2 Myristyl Propionate', [], [FULTON_1984], 'Named individually by Fulton.'),
  comedogenic(
    'Acetylated Lanolin',
    [],
    [FULTON_1984],
    'Fulton singles out acetylated and ethoxylated lanolin derivatives. Only the acetylated ' +
      'form is transcribed: "ethoxylated lanolins" names a family, and picking a PEG number ' +
      'would invent specificity the source does not give.',
  ),
  comedogenic(
    'Lanolin',
    [],
    [FULTON_1984],
    'Fulton: "Lanolins continue to be a problem", before naming the derivatives.',
  ),
];

/**
 * Materials the rabbit-ear studies tested and found negative. Kept so the negative result is
 * as durable as the positive one — sodium lauryl sulfate in particular is a well-known
 * irritant, and irritancy is a separate axis from comedogenicity.
 */
export const nonComedogenicControls: readonly string[] = [
  'Cetyl Alcohol',
  'Stearyl Alcohol',
  'Paraffin',
  'Sodium Lauryl Sulfate',
  'Petrolatum',
];

/**
 * Photosensitising ingredients.
 *
 * Unlike `comedogenic`, this category IS regulation-backed. Three Annex III entries carry a
 * restriction whose subject matter is light exposure, in the regulation's own words:
 * "Not to be used in sunscreen products and products marketed for exposure to
 * natural/artificial UV light". That sentence is the evidence; nothing here is inferred.
 *
 * Entries 308 and 309 additionally cap alpha-terthienyl (terthiophen) at 0,35 % of the
 * extract or oil, which is the constituent the restriction exists to control.
 *
 * Deliberately NOT included: Annex II entry 358 prohibits furocoumarins (trioxysalen,
 * 8-methoxypsoralen, 5-methoxypsoralen) except at natural levels in essences. That is a
 * prohibition, not a risk tag, and "Furocoumarines" is a substance class that no label
 * would ever print, so it has no place in a name-matched ingredient table.
 *
 * Also not included: the Annex III citrus oils (entries 350-358, bergamot, lemon and the
 * rest). They look like photosensitisers and several genuinely are, but their Annex III
 * entries impose only the Article 19(1)(g) disclosure threshold, with no UV restriction at
 * all. They are already seeded as `fragrance_allergen`, which is what the regulation
 * actually says about them. Tagging them here would be our inference, not the regulator's.
 */

const ANNEX_III_UV = (entry: number) =>
  `Regulation (EC) No 1223/2009, Annex III entry ${entry} (consolidated text, ` +
  `CELEX:02009R1223) — restriction: "Not to be used in sunscreen products and products ` +
  `marketed for exposure to natural/artificial UV light"`;

export const curatedPhotosensitizers: CuratedRiskEntry[] = [
  {
    inciName: 'Tagetes Minuta Flower Extract',
    aliases: ['Tagetes Minuta Flower Oil'],
    riskCategory: 'photosensitizing',
    annexEntry: 308,
    casNumbers: ['91770-75-1', '8016-84-0'],
    ecNumbers: ['294-862-7'],
    sourceCitation: ANNEX_III_UV(308),
    notes:
      'Leave-on 0,01 %, rinse-off 0,1 %. Alpha terthienyl (terthiophen) content of the ' +
      'extract/oil must not exceed 0,35 %. Shares a combined limit with entry 309.',
  },
  {
    inciName: 'Tagetes Patula Flower Extract',
    aliases: ['Tagetes Patula Flower Oil'],
    riskCategory: 'photosensitizing',
    annexEntry: 309,
    casNumbers: ['91722-29-1', '8016-84-0'],
    ecNumbers: ['294-431-3'],
    sourceCitation: ANNEX_III_UV(309),
    notes:
      'Leave-on 0,01 %, rinse-off 0,1 %. Alpha terthienyl (terthiophen) content of the ' +
      'extract/oil must not exceed 0,35 %. Shares a combined limit with entry 308. ' +
      'Tagetes erecta, a third species, is prohibited outright by Annex II entry 1383.',
  },
  {
    // The consolidated Annex III leaves the INCI column blank here, so the substance name is used.
    inciName: 'Methyl-N-methylanthranilate',
    aliases: [],
    riskCategory: 'photosensitizing',
    annexEntry: 323,
    casNumbers: ['85-91-6'],
    ecNumbers: ['201-642-6'],
    sourceCitation: ANNEX_III_UV(323),
    notes: 'Leave-on 0,1 %, rinse-off 0,2 %. Must also not be used with nitrosating agents.',
  },
];

/**
 * Common irritants.
 *
 * Literature-only, like `comedogenic`. Annex III contains no restriction anywhere that turns
 * on irritation — the word does not appear once in its 12,000 lines — so there is nothing
 * regulatory to anchor to.
 *
 * The list is short on purpose. Irritancy is dose- and vehicle-dependent, and the literature
 * is full of papers that measure irritation using an ingredient rather than papers that
 * establish an ingredient is an irritant. Only ingredients a source names outright are here.
 *
 * A distinction worth preserving: irritation is not allergy. An irritant damages the barrier
 * in anyone given enough exposure; an allergen provokes an immune response in the sensitised
 * only. Several sources conflate them. Entries here are irritants, and the separate
 * `preservative_sensitizer` and `fragrance_allergen` categories carry the allergy evidence.
 */

const YU_SCHALOCK_2026 =
  'Yu J, Schalock PC. Aspects of Adverse Effects of Cosmetic Products: An Invited Narrative Review. Acta Derm Venereol. 2026;106:adv-2026-0340. doi:10.2340/actadv.v106.adv-2026-0340 (PMID 42343576) — "Anionic surfactants, including sodium lauryl sulfate (SLS) ... sodium laureth sulfate and TEA-lauryl sulfate, are known to be potent irritants"';

const GLOOR_2004 =
  'Gloor M, Senger B, Langenauer M, Fluhr JW. On the course of the irritant reaction after irritation with sodium lauryl sulphate. Skin Res Technol. 2004;10(3):144-148. doi:10.1111/j.1600-0846.2004.00074.x (PMID 15225263)';

const BRANCO_2005 =
  'Branco N, Lee I, Zhai H, Maibach HI. Long-term repetitive sodium lauryl sulfate-induced irritation of the skin: an in vivo study. Contact Dermatitis. 2005;53(5):278-284. doi:10.1111/j.0105-1873.2005.00703.x (PMID 16283906)';

const NUSKEN_2024 =
  'Nüsken M, Heinemeier F, Matzke SS, et al. Immune response to topical sodium lauryl sulfate differs from classical irritant and allergic contact dermatitis. Eur J Immunol. 2024;54(12):e2350798. doi:10.1002/eji.202350798 (PMID 39498726)';

const irritant = (
  inciName: string,
  aliases: string[],
  refs: string[],
  notes: string,
): CuratedRiskEntry => ({
  inciName,
  aliases,
  riskCategory: 'common_irritant',
  annexEntry: 0,
  casNumbers: [],
  ecNumbers: [],
  sourceCitation: refs.join(' | '),
  notes,
});

export const curatedCommonIrritants: CuratedRiskEntry[] = [
  irritant(
    'Sodium Lauryl Sulfate',
    ['SLS', 'Sodium Dodecyl Sulfate'],
    [YU_SCHALOCK_2026, GLOOR_2004, BRANCO_2005, NUSKEN_2024],
    'The reference irritant. Used as the positive control in diagnostic patch testing, ' +
      'which is why its irritancy is better characterised than any other cosmetic ingredient.',
  ),
  irritant(
    'Sodium Laureth Sulfate',
    ['SLES', 'Sodium Lauryl Ether Sulfate'],
    [YU_SCHALOCK_2026],
    'Named as a potent irritant alongside SLS. Often marketed as the milder substitute for ' +
      'SLS; the source does not support treating it as non-irritant.',
  ),
  irritant(
    'TEA-Lauryl Sulfate',
    ['Triethanolamine Lauryl Sulfate'],
    [YU_SCHALOCK_2026],
    'Named as a potent irritant alongside SLS.',
  ),
];
