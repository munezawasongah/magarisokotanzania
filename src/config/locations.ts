/**
 * Tanzania administrative regions (31: 26 Mainland + 5 Zanzibar) with their
 * districts/councils. Used by the seed script and by static dropdowns.
 * Dar es Salaam is listed first because it is the largest vehicle market.
 */
export type RegionSeed = {
  name: string;
  nameSw?: string;
  zone: string;
  isZanzibar?: boolean;
  districts: string[];
};

export const TZ_REGIONS: RegionSeed[] = [
  { name: "Dar es Salaam", zone: "Coastal", districts: ["Kinondoni", "Ilala", "Temeke", "Ubungo", "Kigamboni"] },
  { name: "Arusha", zone: "Northern", districts: ["Arusha City", "Arusha Rural", "Meru", "Karatu", "Monduli", "Longido", "Ngorongoro"] },
  { name: "Mwanza", zone: "Lake", districts: ["Nyamagana", "Ilemela", "Buchosa", "Kwimba", "Magu", "Misungwi", "Sengerema", "Ukerewe"] },
  { name: "Dodoma", zone: "Central", districts: ["Dodoma City", "Bahi", "Chamwino", "Chemba", "Kondoa", "Kongwa", "Mpwapwa"] },
  { name: "Mbeya", zone: "Southern Highlands", districts: ["Mbeya City", "Mbeya Rural", "Chunya", "Kyela", "Mbarali", "Rungwe", "Busokelo"] },
  { name: "Kilimanjaro", zone: "Northern", districts: ["Moshi Municipal", "Moshi Rural", "Hai", "Rombo", "Same", "Mwanga", "Siha"] },
  { name: "Morogoro", zone: "Eastern", districts: ["Morogoro Municipal", "Morogoro Rural", "Gairo", "Ifakara", "Kilombero", "Kilosa", "Malinyi", "Mvomero", "Ulanga"] },
  { name: "Tanga", zone: "Northern", districts: ["Tanga City", "Handeni", "Kilindi", "Korogwe", "Lushoto", "Bumbuli", "Muheza", "Mkinga", "Pangani"] },
  { name: "Pwani", nameSw: "Pwani (Coast)", zone: "Coastal", districts: ["Kibaha Town", "Kibaha Rural", "Bagamoyo", "Chalinze", "Kisarawe", "Mafia", "Mkuranga", "Rufiji", "Kibiti"] },
  { name: "Mjini Magharibi", nameSw: "Mjini Magharibi (Zanzibar Urban West)", zone: "Zanzibar", isZanzibar: true, districts: ["Mjini", "Magharibi A", "Magharibi B"] },
  { name: "Kaskazini Unguja", nameSw: "Kaskazini Unguja (Zanzibar North)", zone: "Zanzibar", isZanzibar: true, districts: ["Kaskazini A", "Kaskazini B"] },
  { name: "Kusini Unguja", nameSw: "Kusini Unguja (Zanzibar South)", zone: "Zanzibar", isZanzibar: true, districts: ["Kati", "Kusini"] },
  { name: "Kaskazini Pemba", nameSw: "Kaskazini Pemba (Pemba North)", zone: "Zanzibar", isZanzibar: true, districts: ["Wete", "Micheweni"] },
  { name: "Kusini Pemba", nameSw: "Kusini Pemba (Pemba South)", zone: "Zanzibar", isZanzibar: true, districts: ["Chake Chake", "Mkoani"] },
  { name: "Geita", zone: "Lake", districts: ["Geita Town", "Geita Rural", "Bukombe", "Chato", "Mbogwe", "Nyang'hwale"] },
  { name: "Iringa", zone: "Southern Highlands", districts: ["Iringa Municipal", "Iringa Rural", "Kilolo", "Mafinga Town", "Mufindi"] },
  { name: "Kagera", zone: "Lake", districts: ["Bukoba Municipal", "Bukoba Rural", "Biharamulo", "Karagwe", "Kyerwa", "Missenyi", "Muleba", "Ngara"] },
  { name: "Katavi", zone: "Western", districts: ["Mpanda Municipal", "Mpimbwe", "Mlele", "Nsimbo", "Tanganyika"] },
  { name: "Kigoma", zone: "Western", districts: ["Kigoma-Ujiji", "Kigoma Rural", "Buhigwe", "Kakonko", "Kasulu", "Kibondo", "Uvinza"] },
  { name: "Lindi", zone: "Southern", districts: ["Lindi Municipal", "Mtama", "Kilwa", "Liwale", "Nachingwea", "Ruangwa"] },
  { name: "Manyara", zone: "Northern", districts: ["Babati Town", "Babati Rural", "Hanang", "Kiteto", "Mbulu", "Simanjiro"] },
  { name: "Mara", zone: "Lake", districts: ["Musoma Municipal", "Musoma Rural", "Bunda", "Butiama", "Rorya", "Serengeti", "Tarime"] },
  { name: "Mtwara", zone: "Southern", districts: ["Mtwara Municipal", "Mtwara Rural", "Masasi", "Nanyamba", "Nanyumbu", "Newala", "Tandahimba"] },
  { name: "Njombe", zone: "Southern Highlands", districts: ["Njombe Town", "Njombe Rural", "Ludewa", "Makambako", "Makete", "Wanging'ombe"] },
  { name: "Rukwa", zone: "Southern Highlands", districts: ["Sumbawanga Municipal", "Sumbawanga Rural", "Kalambo", "Nkasi"] },
  { name: "Ruvuma", zone: "Southern", districts: ["Songea Municipal", "Songea Rural", "Madaba", "Mbinga", "Namtumbo", "Nyasa", "Tunduru"] },
  { name: "Shinyanga", zone: "Lake", districts: ["Shinyanga Municipal", "Shinyanga Rural", "Kahama", "Kishapu", "Msalala", "Ushetu"] },
  { name: "Simiyu", zone: "Lake", districts: ["Bariadi", "Busega", "Itilima", "Maswa", "Meatu"] },
  { name: "Singida", zone: "Central", districts: ["Singida Municipal", "Singida Rural", "Ikungi", "Iramba", "Itigi", "Manyoni", "Mkalama"] },
  { name: "Songwe", zone: "Southern Highlands", districts: ["Mbozi", "Tunduma", "Ileje", "Momba", "Songwe"] },
  { name: "Tabora", zone: "Western", districts: ["Tabora Municipal", "Igunga", "Kaliua", "Nzega", "Sikonge", "Urambo", "Uyui"] },
];
