import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set');
}

let supabaseClient;

function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_ROLE_KEY || '', {
      auth: { persistSession: false },
    });
  }
  return supabaseClient;
}

function applyProjection(rows, projection = {}) {
  if (!projection || Object.keys(projection).length === 0) return rows;
  const entries = Object.entries(projection).filter(([k]) => k !== '_id');
  if (entries.length === 0) {
    if (projection._id === 0) {
      return rows.map((row) => {
        const { _id, ...rest } = row;
        return rest;
      });
    }
    return rows;
  }

  const hasIncludes = entries.some(([, v]) => v === 1 || v === true);
  const hasExcludes = entries.some(([, v]) => v === 0 || v === false);

  // Follow Mongo-style projection semantics used by this app:
  // - include-mode: keep only explicitly included fields
  // - exclude-mode: drop explicitly excluded fields
  if (hasIncludes && hasExcludes) {
    return rows;
  }

  if (hasIncludes) {
    return rows.map((row) => {
      const projected = {};
      for (const [key, val] of entries) {
        if (val === 1 || val === true) projected[key] = row[key];
      }
      return projected;
    });
  }

  if (hasExcludes) {
    return rows.map((row) => {
      const projected = { ...row };
      for (const [key, val] of entries) {
        if (val === 0 || val === false) delete projected[key];
      }
      return projected;
    });
  }

  return rows.map((row) => {
    const { _id, ...rest } = row;
    return rest;
  });
}

function buildSupabaseQuery(baseQuery, filter = {}) {
  let query = baseQuery;
  for (const [key, value] of Object.entries(filter)) {
    if (value && typeof value === 'object' && value.$regex !== undefined) {
      query = query.ilike(key, `%${value.$regex}%`);
      continue;
    }
    query = query.eq(key, value);
  }
  return query;
}

class SupabaseCursor {
  constructor(client, table, filter = {}, options = {}) {
    this.client = client;
    this.table = table;
    this.filter = filter;
    this.options = options;
    this.sortField = null;
    this.sortAscending = true;
    this.limitValue = null;
  }

  sort(sortObj = {}) {
    const [field, order] = Object.entries(sortObj)[0] || [];
    if (field) {
      this.sortField = field;
      this.sortAscending = order !== -1;
    }
    return this;
  }

  limit(n) {
    this.limitValue = n;
    return this;
  }

  async toArray() {
    let query = this.client.from(this.table).select('*');
    query = buildSupabaseQuery(query, this.filter);
    if (this.sortField) {
      query = query.order(this.sortField, { ascending: this.sortAscending });
    }
    if (this.limitValue !== null) {
      query = query.limit(this.limitValue);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return applyProjection(data || [], this.options.projection);
  }
}

class SupabaseCollection {
  constructor(client, table) {
    this.client = client;
    this.table = table;
  }

  find(filter = {}, options = {}) {
    return new SupabaseCursor(this.client, this.table, filter, options);
  }

  async findOne(filter = {}, options = {}) {
    let query = this.client.from(this.table).select('*');
    query = buildSupabaseQuery(query, filter).limit(1);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const rows = applyProjection(data || [], options.projection);
    return rows[0] || null;
  }

  async insertOne(doc) {
    const { error } = await this.client.from(this.table).insert(doc);
    if (error) throw new Error(error.message);
    return { insertedId: doc.id || null };
  }

  async updateOne(filter, update = {}) {
    const payload = {};
    if (update.$set && typeof update.$set === 'object') {
      Object.assign(payload, update.$set);
    }
    if (update.$inc && typeof update.$inc === 'object') {
      const existing = await this.findOne(filter);
      if (!existing) return { matchedCount: 0, modifiedCount: 0 };
      for (const [key, incVal] of Object.entries(update.$inc)) {
        payload[key] = (Number(existing[key]) || 0) + Number(incVal);
      }
    }
    let query = this.client.from(this.table).update(payload);
    query = buildSupabaseQuery(query, filter);
    const { data, error } = await query.select('id').limit(1);
    if (error) throw new Error(error.message);
    const modified = (data || []).length > 0 ? 1 : 0;
    return { matchedCount: modified, modifiedCount: modified };
  }

  async deleteOne(filter) {
    let query = this.client.from(this.table).delete();
    query = buildSupabaseQuery(query, filter);
    const { data, error } = await query.select('id').limit(1);
    if (error) throw new Error(error.message);
    return { deletedCount: (data || []).length > 0 ? 1 : 0 };
  }

  async deleteMany(filter = {}) {
    let query = this.client.from(this.table).delete();
    query = buildSupabaseQuery(query, filter);
    const { data, error } = await query.select('id');
    if (error) throw new Error(error.message);
    return { deletedCount: (data || []).length };
  }
}

class SupabaseDbAdapter {
  constructor(client) {
    this.client = client;
  }

  collection(name) {
    return new SupabaseCollection(this.client, name);
  }
}

export async function getDb() {
  return new SupabaseDbAdapter(getSupabaseClient());
}
