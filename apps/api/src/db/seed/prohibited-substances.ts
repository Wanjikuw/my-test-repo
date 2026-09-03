/**
 * Fragrance-relevant substances PROHIBITED in cosmetic products.
 *
 * Source: Regulation (EC) No 1223/2009, Annex II (consolidated text). This is a different
 * instrument from Annex III and carries different semantics: Annex III restricts, Annex II
 * forbids. An ingredient listed here on a label means the product is non-compliant, not
 * merely that a sensitised user should avoid it.
 *
 * Scope is deliberately narrow. Annex II runs to ~1,700 entries covering arsenic, narcotics
 * and radioactive substances; only the fragrance-relevant entries are transcribed here,
 * because those are the ones that can plausibly appear on a cosmetic ingredient list.
 *
 * Three of these were previously treated as declarable Annex III allergens and were later
 * banned outright (entries 1380-1382). That is why this file exists: scoring them as
 * "restricted" would understate them.
 */

export interface ProhibitedSubstance {
  /** Name as given in the regulation. */
  name: string;
  /** Additional names a label might realistically use. */
  aliases: string[];
  annexIIEntry: number;
  casNumbers: string[];
  ecNumbers: string[];
  /**
   * Some entries are prohibited only in a specific role; entry 424 bans benzyl cyanide
   * "when used as a fragrance ingredient", not as a substance outright.
   */
  prohibitedOnlyAsFragrance: boolean;
  sourceCitation: string;
  notes?: string;
}

const ANNEX_II = (entry: number, amendment?: string) =>
  `Regulation (EC) No 1223/2009, Annex II, entry ${entry}` +
  (amendment ? ` (as amended, ${amendment})` : ' (consolidated text)');

/**
 * Banned outright. All three were formerly individually-labelled fragrance allergens,
 * removed from Annex III and prohibited by Commission Regulation (EU) 2017/1410.
 */
export const bannedFormerAllergens: ProhibitedSubstance[] = [
  {
    name: '3- and 4-(4-Hydroxy-4-methylpentyl)cyclohex-3-ene-1-carbaldehyde',
    aliases: ['HICC', 'Hydroxyisohexyl 3-Cyclohexene Carboxaldehyde', 'Lyral'],
    annexIIEntry: 1380,
    casNumbers: ['51414-25-6', '31906-04-4'],
    ecNumbers: ['257-187-9', '250-863-4'],
    prohibitedOnlyAsFragrance: false,
    sourceCitation: ANNEX_II(1380, 'Regulation (EU) 2017/1410'),
    notes: 'Formerly an Annex III declarable allergen. Prohibited, not restricted.',
  },
  {
    name: '2,6-Dihydroxy-4-methyl-benzaldehyde',
    aliases: ['Atranol'],
    annexIIEntry: 1381,
    casNumbers: ['526-37-4'],
    ecNumbers: [],
    prohibitedOnlyAsFragrance: false,
    sourceCitation: ANNEX_II(1381, 'Regulation (EU) 2017/1410'),
    notes: 'Oak moss / tree moss constituent.',
  },
  {
    name: '3-Chloro-2,6-Dihydroxy-4-methyl-benzaldehyde',
    aliases: ['Chloroatranol'],
    annexIIEntry: 1382,
    casNumbers: ['57074-21-2'],
    ecNumbers: [],
    prohibitedOnlyAsFragrance: false,
    sourceCitation: ANNEX_II(1382, 'Regulation (EU) 2017/1410'),
    notes: 'Oak moss / tree moss constituent.',
  },
];

/** Prohibited specifically in the role of a fragrance ingredient. */
export const prohibitedFragranceIngredients: ProhibitedSubstance[] = [
  {
    name: 'Alanroot oil (Inula helenium L.)',
    aliases: ['Inula Helenium', 'Elecampane oil'],
    annexIIEntry: 423,
    casNumbers: ['97676-35-2'],
    ecNumbers: [],
    prohibitedOnlyAsFragrance: true,
    sourceCitation: ANNEX_II(423),
  },
  {
    name: 'Benzyl cyanide',
    aliases: [],
    annexIIEntry: 424,
    casNumbers: ['140-29-4'],
    ecNumbers: ['205-410-5'],
    prohibitedOnlyAsFragrance: true,
    sourceCitation: ANNEX_II(424),
  },
  {
    name: 'Cyclamen alcohol',
    aliases: [],
    annexIIEntry: 425,
    casNumbers: ['4756-19-8'],
    ecNumbers: ['225-289-2'],
    prohibitedOnlyAsFragrance: true,
    sourceCitation: ANNEX_II(425),
  },
  {
    name: 'Diethyl maleate',
    aliases: [],
    annexIIEntry: 426,
    casNumbers: ['141-05-9'],
    ecNumbers: ['205-451-9'],
    prohibitedOnlyAsFragrance: true,
    sourceCitation: ANNEX_II(426),
  },
  {
    name: '3,4-Dihydrocoumarin',
    aliases: ['Dihydrocoumarin'],
    annexIIEntry: 427,
    casNumbers: ['119-84-6'],
    ecNumbers: ['204-354-9'],
    prohibitedOnlyAsFragrance: true,
    sourceCitation: ANNEX_II(427),
  },
  {
    name: '2,4-Dihydroxy-3-methylbenzaldehyde',
    aliases: [],
    annexIIEntry: 428,
    casNumbers: ['6248-20-0'],
    ecNumbers: ['228-369-5'],
    prohibitedOnlyAsFragrance: true,
    sourceCitation: ANNEX_II(428),
  },
  {
    name: '3,7-Dimethyl-2-octen-1-ol',
    aliases: ['6,7-Dihydrogeraniol'],
    annexIIEntry: 429,
    casNumbers: ['40607-48-5'],
    ecNumbers: ['254-999-5'],
    prohibitedOnlyAsFragrance: true,
    sourceCitation: ANNEX_II(429),
  },
  {
    name: '4,6-Dimethyl-8-tert-butylcoumarin',
    aliases: [],
    annexIIEntry: 430,
    casNumbers: ['17874-34-9'],
    ecNumbers: ['241-827-9'],
    prohibitedOnlyAsFragrance: true,
    sourceCitation: ANNEX_II(430),
  },
  {
    name: 'Dimethyl citraconate',
    aliases: [],
    annexIIEntry: 431,
    casNumbers: ['617-54-9'],
    ecNumbers: [],
    prohibitedOnlyAsFragrance: true,
    sourceCitation: ANNEX_II(431),
  },
  {
    name: '7,11-Dimethyl-4,6,10-dodecatrien-3-one',
    aliases: ['Pseudomethylionone'],
    annexIIEntry: 432,
    casNumbers: ['26651-96-7'],
    ecNumbers: ['247-878-3'],
    prohibitedOnlyAsFragrance: true,
    sourceCitation: ANNEX_II(432),
  },
  {
    name: '6,10-Dimethyl-3,5,9-undecatrien-2-one',
    aliases: ['Pseudoionone'],
    annexIIEntry: 433,
    casNumbers: ['141-10-6'],
    ecNumbers: ['205-457-1'],
    prohibitedOnlyAsFragrance: true,
    sourceCitation: ANNEX_II(433),
  },
  {
    name: 'Diphenylamine',
    aliases: [],
    annexIIEntry: 434,
    casNumbers: ['122-39-4'],
    ecNumbers: ['204-539-4'],
    prohibitedOnlyAsFragrance: true,
    sourceCitation: ANNEX_II(434),
  },
  {
    name: 'Ethyl acrylate',
    aliases: [],
    annexIIEntry: 435,
    casNumbers: ['140-88-5'],
    ecNumbers: ['205-438-8'],
    prohibitedOnlyAsFragrance: true,
    sourceCitation: ANNEX_II(435),
  },
  {
    name: 'Fig leaf absolute (Ficus carica L.)',
    aliases: ['Ficus Carica Leaf Extract'],
    annexIIEntry: 436,
    casNumbers: ['68916-52-9'],
    ecNumbers: [],
    prohibitedOnlyAsFragrance: true,
    sourceCitation: ANNEX_II(436),
  },
  {
    name: 'trans-2-Heptenal',
    aliases: [],
    annexIIEntry: 437,
    casNumbers: ['18829-55-5'],
    ecNumbers: ['242-608-0'],
    prohibitedOnlyAsFragrance: true,
    sourceCitation: ANNEX_II(437),
  },
  {
    name: 'trans-2-Hexenal diethyl acetal',
    aliases: [],
    annexIIEntry: 438,
    casNumbers: ['67746-30-9'],
    ecNumbers: ['266-989-8'],
    prohibitedOnlyAsFragrance: true,
    sourceCitation: ANNEX_II(438),
  },
  {
    name: 'trans-2-Hexenal dimethyl acetal',
    aliases: [],
    annexIIEntry: 439,
    casNumbers: ['18318-83-7'],
    ecNumbers: ['242-204-4'],
    prohibitedOnlyAsFragrance: true,
    sourceCitation: ANNEX_II(439),
  },
  {
    name: 'Hydroabietyl alcohol',
    aliases: [],
    annexIIEntry: 440,
    casNumbers: ['13393-93-6'],
    ecNumbers: ['236-476-3'],
    prohibitedOnlyAsFragrance: true,
    sourceCitation: ANNEX_II(440),
  },
  {
    name: '6-Isopropyl-2-decahydronaphthalenol',
    aliases: [],
    annexIIEntry: 441,
    casNumbers: ['34131-99-2'],
    ecNumbers: ['251-841-7'],
    prohibitedOnlyAsFragrance: true,
    sourceCitation: ANNEX_II(441),
  },
  {
    name: '7-Methoxycoumarin',
    aliases: [],
    annexIIEntry: 442,
    casNumbers: ['531-59-9'],
    ecNumbers: ['208-513-3'],
    prohibitedOnlyAsFragrance: true,
    sourceCitation: ANNEX_II(442),
  },
  {
    name: '4-(4-Methoxyphenyl)-3-butene-2-one',
    aliases: ['Anisylidene acetone'],
    annexIIEntry: 443,
    casNumbers: ['943-88-4'],
    ecNumbers: ['213-404-9'],
    prohibitedOnlyAsFragrance: true,
    sourceCitation: ANNEX_II(443),
  },
  {
    name: '1-(4-Methoxyphenyl)-1-penten-3-one',
    aliases: ['alpha-Methylanisylideneacetone'],
    annexIIEntry: 444,
    casNumbers: ['104-27-8'],
    ecNumbers: ['203-190-5'],
    prohibitedOnlyAsFragrance: true,
    sourceCitation: ANNEX_II(444),
  },
  {
    name: 'Methyl trans-2-butenoate',
    aliases: [],
    annexIIEntry: 445,
    casNumbers: ['623-43-8'],
    ecNumbers: ['210-793-7'],
    prohibitedOnlyAsFragrance: true,
    sourceCitation: ANNEX_II(445),
  },
  {
    name: '7-Methylcoumarin',
    aliases: [],
    annexIIEntry: 446,
    casNumbers: ['2445-83-2'],
    ecNumbers: ['219-499-3'],
    prohibitedOnlyAsFragrance: true,
    sourceCitation: ANNEX_II(446),
  },
  {
    name: '5-Methyl-2,3-hexanedione',
    aliases: ['Acetyl isovaleryl'],
    annexIIEntry: 447,
    casNumbers: ['13706-86-0'],
    ecNumbers: ['237-241-8'],
    prohibitedOnlyAsFragrance: true,
    sourceCitation: ANNEX_II(447),
  },
  {
    name: '2-Pentylidenecyclohexanone',
    aliases: [],
    annexIIEntry: 448,
    casNumbers: ['25677-40-1'],
    ecNumbers: ['247-178-8'],
    prohibitedOnlyAsFragrance: true,
    sourceCitation: ANNEX_II(448),
  },
  {
    name: '3,6,10-Trimethyl-3,5,9-undecatrien-2-one',
    aliases: ['Pseudo-Isomethyl ionone'],
    annexIIEntry: 449,
    casNumbers: ['1117-41-5'],
    ecNumbers: ['214-245-8'],
    prohibitedOnlyAsFragrance: true,
    sourceCitation: ANNEX_II(449),
  },
  {
    name: 'Verbena essential oils (Lippia citriodora Kunth.) and derivatives other than absolute',
    aliases: ['Lippia Citriodora Oil', 'Verbena oil'],
    annexIIEntry: 450,
    casNumbers: ['8024-12-2'],
    ecNumbers: ['285-515-0'],
    prohibitedOnlyAsFragrance: true,
    sourceCitation: ANNEX_II(450, 'marked M1 in the consolidated text'),
  },
  {
    name: 'Costus root oil (Saussurea lappa Clarke)',
    aliases: ['Saussurea Lappa Root Extract', 'Costus root oil'],
    annexIIEntry: 1133,
    casNumbers: ['8023-88-9'],
    ecNumbers: [],
    prohibitedOnlyAsFragrance: true,
    sourceCitation: ANNEX_II(1133),
  },
  {
    name: '7-Ethoxy-4-methylcoumarin',
    aliases: [],
    annexIIEntry: 1134,
    casNumbers: ['87-05-8'],
    ecNumbers: ['201-721-5'],
    prohibitedOnlyAsFragrance: true,
    sourceCitation: ANNEX_II(1134),
  },
  {
    name: 'Hexahydrocoumarin',
    aliases: [],
    annexIIEntry: 1135,
    casNumbers: ['700-82-3'],
    ecNumbers: ['211-851-4'],
    prohibitedOnlyAsFragrance: true,
    sourceCitation: ANNEX_II(1135),
  },
  {
    name: 'Exudation of Myroxylon pereirae (Royle) Klotzsch (Peru balsam, crude)',
    aliases: ['Myroxylon Pereirae Resin', 'Peru balsam', 'Balsam Peru'],
    annexIIEntry: 1136,
    casNumbers: ['8007-00-9'],
    ecNumbers: ['232-352-8'],
    prohibitedOnlyAsFragrance: true,
    sourceCitation: ANNEX_II(1136, 'marked M1 in the consolidated text'),
    notes: 'Crude exudation only; Annex III separately restricts the refined extract.',
  },
];

export const prohibitedSubstances: ProhibitedSubstance[] = [
  ...bannedFormerAllergens,
  ...prohibitedFragranceIngredients,
];
