import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'

const COUNTRIES = ['United Kingdom', 'Ireland', 'France', 'Germany', 'Spain', 'Italy', 'Netherlands', 'Belgium', 'Portugal', 'Poland', 'Switzerland', 'Austria', 'Denmark', 'Sweden', 'Norway']

const REGIONS_BY_COUNTRY = {
  'United Kingdom': ['South West', 'South East', 'South Wales', 'Midlands', 'North West', 'North East', 'Scotland', 'Northern Ireland', 'London', 'East Anglia'],
  'Ireland': ['Leinster', 'Munster', 'Connacht', 'Ulster'],
  'France': ['Île-de-France', 'Provence-Alpes-Côte d\'Azur', 'Auvergne-Rhône-Alpes', 'Nouvelle-Aquitaine', 'Occitanie', 'Hauts-de-France', 'Grand Est', 'Normandy', 'Brittany', 'Pays de la Loire'],
  'Germany': ['Bavaria', 'North Rhine-Westphalia', 'Baden-Württemberg', 'Lower Saxony', 'Hesse', 'Saxony', 'Berlin', 'Rhineland-Palatinate', 'Schleswig-Holstein', 'Brandenburg'],
  'Spain': ['Madrid', 'Catalonia', 'Andalusia', 'Valencia', 'Basque Country', 'Galicia', 'Castile and León', 'Canary Islands'],
  'Italy': ['Lombardy', 'Lazio', 'Campania', 'Sicily', 'Veneto', 'Piedmont', 'Emilia-Romagna', 'Tuscany'],
  'Netherlands': ['North Holland', 'South Holland', 'Utrecht', 'North Brabant', 'Gelderland', 'Overijssel'],
  'Belgium': ['Flanders', 'Wallonia', 'Brussels-Capital'],
  'Portugal': ['Lisbon', 'Porto', 'Algarve', 'Centro', 'Norte'],
  'Poland': ['Masovian', 'Silesian', 'Lesser Poland', 'Greater Poland', 'Lower Silesian', 'Pomeran
