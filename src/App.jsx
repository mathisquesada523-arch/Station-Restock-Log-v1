import { useEffect } from "react";
import { supabase } from "./supabase";
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ClipboardPlus,
  PackageCheck,
  History,
  Building2,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";

const stations = [
  "Station 11",
  "Station 12",
  "Station 13",
  "Station 21",
  "Station 22",
  "Station 23",
  "Station 24",
  "Station 31",
  "Station 32",
  "Station 33",
  "Station 34",
  "Station 35",
  "Station 41",
  "Station 42",
];

const supplyCatalog = {
  "Cleaning Supplies": ["Purple Wipes", "Cavicide Spray"],
  PPE: ["Gloves", "Gowns", "Goggles", "N95", "Face Shield"],
  "Oxygen & Respiratory": [
    "D Tank",
    "Nasal Cannula",
    "NRB",
    "BVM",
    "Nebulizer Kit",
    "CPAP",
    "PEEP Valve",
    "Regulator",
    "O-Rings",
    "Christmas Tree",
  ],
  "Trauma & Care": [
    "4x4",
    "5x9",
    "8x10",
    "12x30",
    "Roller Gauze",
    "Cravats",
    "Burn Sheet",
    "Vaseline Gauze",
    "Bandaids",
    "Tape",
    "OB Kit",
    "Saline Bottle",
    "Sal Jet",
    "Cold Packs",
    "Alcohol Prep Pads",
    "Emergency Blanket",
    "Biohazard Bags",
    "Emesis Bags",
    "Disposable Razor",
  ],
  "Equipment & Patient Care": [
    "Trauma Shears",
    "Pen Light",
    "Stethoscope",
    "BP Cuff",
    "AED Pads",
    "Wool Blanket",
  ],
  "Lifting & Moving": [
    "Mega Mover",
    "Reeves",
    "Stair Chair",
    "Pedi Restraints",
    "Backboard",
    "Combi Carrier",
    "KED",
  ],
  "Splinting & Immobilization": [
    "SAM Splint",
    "Board Splint Kit",
    "C-Collar",
    "Head Blocks",
    "Traction Device",
  ],
  Suction: [
    "Laerdal Suction Unit",
    "Laerdal Charging Cable",
    "1200cc Canister",
    "Canister Lid",
    "Hard Suction Kit",
    "Suction Tubing",
    "Hard Catheter",
    "Bulb Syringe",
    "French Catheters (8-18)",
  ],
  "Advanced Hemorrhage": [
    "Tourniquet",
    "Chest Seal",
    "Emergency Trauma Dressing",
    "Triage Tags",
  ],
  Medications: [
    "Glucose",
    "Aspirin",
    "Epi",
    "Narcan",
    "Narcan Leave Behind Kit",
    "Albuterol",
  ],
  "Glucometer Supplies": ["Glucometer", "Test Strips", "Test Solution", "Lancets"],
  Airway: ["NPA Kit", "NPA", "Lube", "OPA Kit", "OPA", "MAD Device"],
};

const today = new Date().toISOString().slice(0, 10);

export default function App() {
  const [view, setView] = useState("crew");
  const [supervisorCode, setSupervisorCode] = useState("");
  const [message, setMessage] = useState("");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [supervisorPage, setSupervisorPage] = useState("restock");
  const [bulkPage, setBulkPage] = useState("count");
  const [inventoryItems, setInventoryItems] = useState([]);
  const [inventoryCounts, setInventoryCounts] = useState({});
  const [editedItems, setEditedItems] = useState({});
  const [editedPar, setEditedPar] = useState({});
  const [movementHistory, setMovementHistory] = useState([]);
  const [inventorySearch, setInventorySearch] = useState("");
  const [showReorderOnly, setShowReorderOnly] = useState(false);
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState("All");
  const [movementEntries, setMovementEntries] = useState({});
  const [form, setForm] = useState({
    date: today,
    employeeId: "",
    station: "",
    category: "",
    item: "",
    qty: "",
    note: "",
  });
  useEffect(() => {
    fetchLogs();
    fetchInventoryItems();
    fetchCurrentInventoryCounts();
    fetchMovementHistory();
  }, []);

    async function fetchLogs() {
    const { data, error } = await supabase
    .from("supply_logs")
    .select("*")
    .eq("archived", false)
    .order("created_at", { ascending: false });

    if (!error && data) {
    const formatted = data.map((log) => ({
      id: log.id,
      date: log.date,
      employeeId: log.employee_id,
      station: log.station,
      category: log.category,
      item: log.item,
      qty: log.quantity,
      note: log.comments || "",
      restocked: log.restocked,
    }));

    setLogs(formatted);
    }

    setLoading(false);
    }
function updateMovementEntry(itemId, field, value) {
  setMovementEntries((prev) => ({
    ...prev,
    [itemId]: {
      ...prev[itemId],
      [field]: value,
    },
  }));
}

async function deleteMovementHistoryItem(id) {
  const confirmDelete = window.confirm(
    "Are you sure you want to delete this movement history entry?"
  );

  if (!confirmDelete) return;

  const { error } = await supabase
    .from("inventory_movements")
    .delete()
    .eq("id", id);

  if (error) {
    setMessage("Error deleting movement history item.");
    return;
  }

  await fetchMovementHistory();
  setMessage("Movement history item deleted.");
}

  async function fetchInventoryItems() {
    const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("active", true)
    .order("category", { ascending: true })
    .order("item_name", { ascending: true });

  if (!error && data) {
    setInventoryItems(data);
  }
}

function calculateMovementAmount(item, movementType, amount) {
  const qty = Number(amount || 0);

  if (movementType === "Case") {
    return qty * Number(item.base_units_per_bulk || 0);
  }

  if (movementType === "Units") {
    return qty * Number(item.base_units_per_inner || 0);
  }

  return qty;
}

async function fetchMovementHistory() {
  const { data, error } = await supabase
    .from("inventory_movements")
    .select(`
      id,
      movement_date,
      movement_type,
      quantity_change,
      inventory_items (
        category,
        item_name
      )
    `)
    .order("movement_date", { ascending: false });

  if (error || !data) return;

  setMovementHistory(data);
}

async function saveMovement(item) {
  const entry = movementEntries[item.id] || {};
  const movement = entry.movement || "Added";
  const type = entry.type || "Case";
  const amount = Number(entry.amount || 0);

  if (amount <= 0) {
  await fetchCurrentInventoryCounts();
  await fetchMovementHistory();
    setMessage("Enter an amount before saving movement.");
    return;
  }

  const movementTotal = calculateMovementAmount(item, type, amount);

  const current = inventoryCounts[item.id] || {};
  const currentCases = Number(current.cases || 0);
  const currentUnits = Number(current.units || 0);
  const currentIndividual = Number(current.individual || 0);

  let updatedCases = currentCases;
let updatedUnits = currentUnits;
let updatedIndividual = currentIndividual;

if (type === "Case") {
  updatedCases =
    movement === "Added"
      ? currentCases + amount
      : Math.max(currentCases - amount, 0);
}

if (type === "Units") {
  updatedUnits =
    movement === "Added"
      ? currentUnits + amount
      : Math.max(currentUnits - amount, 0);
}

if (type === "Individual") {
  updatedIndividual =
    movement === "Added"
      ? currentIndividual + amount
      : Math.max(currentIndividual - amount, 0);
}

  const updatedRow = {
    item_id: item.id,
    bulk_count: updatedCases,
inner_count: updatedUnits,
individual_count: updatedIndividual,
    calculated_total:
      updatedCases * Number(item.base_units_per_bulk || 0) +
      updatedUnits * Number(item.base_units_per_inner || 0) +
      updatedIndividual,
    updated_by: "supervisor",
    updated_at: new Date().toISOString(),
  };

  const { error: countError } = await supabase
    .from("current_inventory_counts")
    .upsert(updatedRow, { onConflict: "item_id" });

  if (countError) {
    console.error(countError);
    setMessage("Error updating inventory count.");
    return;
  }

  const { error: movementError } = await supabase
    .from("inventory_movements")
    .insert({
  item_id: item.id,
  movement_type: movement,
  count_type: type,
  quantity_change: movement === "Added" ? amount : -amount,
});

  if (movementError) {
    console.error(movementError);
    setMessage("Inventory updated, but movement log failed.");
    return;
  }

  setInventoryCounts((prev) => ({
  ...prev,
  [item.id]: {
    cases: updatedCases,
    units: updatedUnits,
    individual: updatedIndividual,
  },
}));

  setMovementEntries((prev) => ({
    ...prev,
    [item.id]: {
      movement: "Added",
      type: "Case",
      amount: "",
    },
  }));
await fetchCurrentInventoryCounts();
await fetchMovementHistory();
  setMessage("Movement saved and inventory updated.");
}

  const pendingLogs = logs.filter((log) => !log.restocked);

  const totalNeeded = pendingLogs.reduce((sum, log) => sum + Number(log.qty), 0);

  function updateForm(field, value) {
    if (field === "category") {
      setForm((current) => ({ ...current, category: value, item: "" }));
      return;
    }
    setForm((current) => ({ ...current, [field]: value }));
  }
async function archiveLog(id) {
  const confirmArchive = window.confirm(
    "Are you sure you want to remove this item from Usage History?"
  );

  if (!confirmArchive) return;

  const { error } = await supabase
    .from("supply_logs")
    .update({ archived: true })
    .eq("id", id);

  if (error) {
    setMessage("Error removing history item. Please try again.");
    return;
  }

  await fetchLogs();
}

async function clearMovementHistory() {
  const confirmClear = window.confirm(
    "Are you sure you want to clear all movement history?"
  );

  if (!confirmClear) return;

  const { error } = await supabase
    .from("inventory_movements")
    .delete()
    .neq("id", 0);

  if (error) {
    setMessage("Error clearing movement history.");
    return;
  }

  await fetchMovementHistory();
  setMessage("Movement history cleared.");
}

async function resetCurrentInventoryCount(item) {
  const confirmReset = window.confirm(
    `Are you sure you want to reset the current count for ${item.item_name} to zero?`
  );

  if (!confirmReset) return;

  const updatedRow = {
    item_id: item.id,
    bulk_count: 0,
    inner_count: 0,
    individual_count: 0,
    calculated_total: 0,
    updated_by: "supervisor",
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("current_inventory_counts")
    .upsert(updatedRow, { onConflict: "item_id" });

  if (error) {
    setMessage("Error resetting current count.");
    return;
  }

  await fetchCurrentInventoryCounts();
  setMessage(`${item.item_name} current count reset to zero.`);
}

async function deleteMovementHistoryItem(id) {
  const confirmDelete = window.confirm(
    "Are you sure you want to delete this movement history entry?"
  );

  if (!confirmDelete) return;

  const { error } = await supabase
    .from("inventory_movements")
    .delete()
    .eq("id", id);

  if (error) {
    setMessage("Error deleting movement history item.");
    return;
  }

  await fetchMovementHistory();
  setMessage("Movement history item deleted.");
}

async function clearMovementHistory() {
  const confirmClear = window.confirm(
    "Are you sure you want to clear all movement history?"
  );

  if (!confirmClear) return;

  const { error } = await supabase
    .from("inventory_movements")
    .delete()
    .neq("id", 0);

  if (error) {
    setMessage("Error clearing movement history.");
    return;
  }

  await fetchMovementHistory();
  setMessage("Movement history cleared.");
}

async function resetCurrentInventoryCount(item) {
  const confirmReset = window.confirm(
    `Are you sure you want to reset the current count for ${item.item_name} to zero?`
  );

  if (!confirmReset) return;

  const updatedRow = {
    item_id: item.id,
    bulk_count: 0,
    inner_count: 0,
    individual_count: 0,
    calculated_total: 0,
    updated_by: "supervisor",
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("current_inventory_counts")
    .upsert(updatedRow, { onConflict: "item_id" });

  if (error) {
    setMessage("Error resetting current count.");
    return;
  }

  await fetchCurrentInventoryCounts();
  setMessage(`${item.item_name} current count reset to zero.`);
}

async function fetchCurrentInventoryCounts() {
  const { data, error } = await supabase
    .from("current_inventory_counts")
    .select("*");

  if (error || !data) return;

  const loadedCounts = {};

  data.forEach((row) => {
    loadedCounts[row.item_id] = {
      cases: row.bulk_count || "",
      units: row.inner_count || "",
      individual: row.individual_count || "",
    };
  });

  setInventoryCounts(loadedCounts);
}

function startNewCount() {
  const confirmNew = window.confirm(
    "Are you sure you want to start a new count? This will clear your current count entries."
  );

  if (!confirmNew) return;

  setInventoryCounts({});
  setMessage("New count started.");
}

  async function submitLog() {
    if (!form.station) return setMessage("Please select a station.");
    if (!form.category) return setMessage("Please select a category.");
    if (!form.item) return setMessage("Please select an item.");
    if (!form.employeeId.trim())
      return setMessage("Please enter your Employee ID before submitting.");
    if (!form.qty || Number(form.qty) < 1)
      return setMessage("Quantity must be at least 1.");

    const newLog = {
      id: Date.now(),
      date: form.date,
      employeeId: form.employeeId.trim(),
      station: form.station,
      category: form.category,
      item: form.item,
      qty: Number(form.qty),
      note: form.note.trim(),
      restocked: false,
    };

    const { error } = await supabase.from("supply_logs").insert([
  {
    date: newLog.date,
    employee_id: newLog.employeeId,
    station: newLog.station,
    category: newLog.category,
    item: newLog.item,
    quantity: newLog.qty,
    comments: newLog.note,
    restocked: false,
  },
]);

if (error) {
  setMessage("Error saving log. Please try again.");
  return;
}

await fetchLogs();
    setMessage(
      `Submitted: Employee ${newLog.employeeId} took ${newLog.qty} ${newLog.item} from ${newLog.station}. Supervisor dashboard updated.`
    );

    setForm({
      date: today,
      employeeId: "",
      station: "",
      category: "",
      item: "",
      qty: "",
      note: "",
    });
  }

  function supervisorLogin() {
    if (supervisorCode === "medstar7021") {
      setView("supervisor");
      setMessage("");
      return;
    }
    setMessage("Invalid supervisor code.");
  }

  function supervisorLogout() {
    setView("crew");
    setSupervisorCode("");
    setMessage("");
  }

  function markItemRestocked(logIds) {
    setLogs((current) =>
      current.map((log) =>
        logIds.includes(log.id) ? { ...log, restocked: true } : log
      )
    );
  }

async function saveInventoryCount() {
  const rowsToSave = inventoryItems.map((item) => {
    const count = inventoryCounts[item.id] || {};

    const bulkCount = Number(count.cases || 0);
    const innerCount = Number(count.units || 0);
    const individualCount = Number(count.individual || 0);

    return {
      item_id: item.id,
      bulk_count: bulkCount,
      inner_count: innerCount,
      individual_count: individualCount,
      calculated_total: calculateInventoryTotal(item),
      updated_by: "supervisor",
      updated_at: new Date().toISOString(),
    };
  });

  const { error } = await supabase
    .from("current_inventory_counts")
    .upsert(rowsToSave, {
      onConflict: "item_id",
    });

  if (error) {
    console.error(error);
    setMessage("Error saving inventory count.");
    return;
  }

  setMessage("Inventory count saved.");
}

function calculateInventoryTotal(item) {
  const count = inventoryCounts[item.id] || {};

  const caseCount = Number(count.cases || 0);
  const unitCount = Number(count.units || 0);
  const individualCount = Number(count.individual || 0);

  const caseQty = Number(item.base_units_per_bulk || 0);
  const unitQty = Number(item.base_units_per_inner || 0);

  return caseCount * caseQty + unitCount * unitQty + individualCount;
}
const inventoryCategories = [
  "All",
  ...new Set(inventoryItems.map((item) => item.category)),
];

const freeholdItemsNeedingReorder = inventoryItems.filter((item) => {
  const currentTotal = calculateInventoryTotal(item);
  const parAmount = Number(item.par_amount || 0);

  return parAmount > 0 && currentTotal < parAmount;
});

const freeholdTotalReorderNeeded = freeholdItemsNeedingReorder.length;

const freeholdTotalItems = inventoryItems.length;

const freeholdRecentMovements = movementHistory.length;

const filteredInventoryItems = inventoryItems.filter((item) => {
  const matchesCategory =
    inventoryCategoryFilter === "All" ||
    item.category === inventoryCategoryFilter;

  const searchText = inventorySearch.toLowerCase();

  const matchesSearch =
    !searchText ||
    item.category?.toLowerCase().includes(searchText) ||
    item.item_name?.toLowerCase().includes(searchText);

  return matchesCategory && matchesSearch;
});

const reorderFilteredItems = filteredInventoryItems.filter((item) => {
  if (!showReorderOnly) return true;

  const currentTotal = calculateInventoryTotal(item);
  const parAmount = Number(item.par_amount || 0);

  return currentTotal < parAmount;
});

function updateEditedPar(itemId, field, value) {
  setEditedPar((prev) => ({
    ...prev,
    [itemId]: {
      ...prev[itemId],
      [field]: value,
    },
  }));
}

async function saveParSetting(item) {
  const edits = editedPar[item.id] || {};

  const updatedPar = {
    par_type: edits.par_type || item.par_type || "Case",
    par_amount: Number(edits.par_amount ?? item.par_amount ?? 0),
  };

  const { error } = await supabase
    .from("inventory_items")
    .update(updatedPar)
    .eq("id", item.id);

  if (error) {
    setMessage("Error saving PAR setting.");
    return;
  }

  setMessage("PAR setting saved.");
  await fetchInventoryItems();
}

  function markStationRestocked(station) {
    setLogs((current) =>
      current.map((log) =>
        !log.restocked && log.station === station
          ? { ...log, restocked: true }
          : log
      )
    );
  }

  function undoRestocked(id) {
    setLogs((current) =>
      current.map((log) =>
        log.id === id ? { ...log, restocked: false } : log
      )
    );
  }

  function clearAllLogs() {
    setLogs([]);
  }

function updateEditedItem(itemId, field, value) {
  setEditedItems((prev) => ({
    ...prev,
    [itemId]: {
      ...prev[itemId],
      [field]: value,
    },
  }));
}


async function saveInventoryItem(item) {
  const edits = editedItems[item.id] || {};

  const updatedItem = {
    bulk_unit: edits.bulk_unit ?? item.bulk_unit,
    inner_unit: edits.inner_unit ?? item.inner_unit,
    base_unit: edits.base_unit ?? item.base_unit,
    base_units_per_bulk: Number(edits.base_units_per_bulk ?? item.base_units_per_bulk ?? 0),
    base_units_per_inner: Number(edits.base_units_per_inner ?? item.base_units_per_inner ?? 0),
  };

  const { error } = await supabase
    .from("inventory_items")
    .update(updatedItem)
    .eq("id", item.id);

  if (error) {
    setMessage("Error saving item settings.");
    return;
  }

  setMessage("Item settings saved.");
  await fetchInventoryItems();
}

  const mostUsedItem = (() => {
    if (pendingLogs.length === 0) return "None";
    const counts = {};
    pendingLogs.forEach((log) => {
      counts[log.item] = (counts[log.item] || 0) + log.qty;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  })();

  return (
    <div className="app">
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="header"
      >
        <div className="brand">
          <div className="brandIcon">
            <PackageCheck size={32} />
          </div>
          <h1>Station Restock Log</h1>
        </div>

        {view === "supervisor" ? (
          <button className="btn secondary" onClick={supervisorLogout}>
            Exit Supervisor View
          </button>
        ) : (
          <div className="supervisorLogin">
            <input
              value={supervisorCode}
              onChange={(e) => setSupervisorCode(e.target.value)}
              type="password"
              placeholder="Supervisor code"
            />
            <button className="btn" onClick={supervisorLogin}>
              Supervisor Login
            </button>
          </div>
        )}
      </motion.header>

      {message && (
        <div className={message.includes("updated") ? "message success" : "message warning"}>
          {message}
        </div>
      )}

      {view === "crew" ? (
        <main className="crewPage">
          <section className="card formCard">
            <h2>
              <ClipboardPlus size={28} /> Station Restock Log
            </h2>
            <p className="subtext">
              Fill out when restocking equipment.
            </p>

            <div className="formGrid">
              <Field label="Date">
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => updateForm("date", e.target.value)}
                />
              </Field>

              <Field label="Employee ID">
                <input
                  value={form.employeeId}
                  onChange={(e) => updateForm("employeeId", e.target.value)}
                  placeholder="Example: 1234"
                />
              </Field>

              <Field label="Station">
                <select
                  value={form.station}
                  onChange={(e) => updateForm("station", e.target.value)}
                >
                  <option value="">Select Station</option>
                  {stations.map((station) => (
                    <option key={station}>{station}</option>
                  ))}
                </select>
              </Field>

              <Field label="Category">
                <select
                  value={form.category}
                  onChange={(e) => updateForm("category", e.target.value)}
                >
                  <option value="">Select Category</option>
                  {Object.keys(supplyCatalog).map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </Field>

              <Field label="Item">
                <select
                  value={form.item}
                  onChange={(e) => updateForm("item", e.target.value)}
                  disabled={!form.category}
                >
                  <option value="">Select Item</option>
                  {(supplyCatalog[form.category] || []).map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>

              <Field label="Quantity Taken">
                <input
                  type="number"
                  min="1"
                  value={form.qty}
                  onChange={(e) => updateForm("qty", e.target.value)}
                />
              </Field>

              <div className="wide">
                <Field label="Size or Other Comments">
                  <textarea
                    value={form.note}
                    onChange={(e) => updateForm("note", e.target.value)}
                    placeholder="Example: Adult, pediatric, large, medium, or other comments"
                  />
                </Field>
              </div>
            </div>

            <button className="submitBtn" onClick={submitLog}>
              <ClipboardPlus size={26} />
              Submit Used Supply
            </button>

            <p className="helpText">
              After submitting, this exact entry will appear in supervisor view
              with station, employee ID, item, quantity, and comments.
            </p>
          </section>
        </main>
      ) : (
        <main className="supervisorPage">
        <div
  style={{
    display: "flex",
    gap: "14px",
    marginBottom: "32px",
    padding: "14px",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    background: "rgba(15, 23, 42, 0.85)",
    border: "1px solid rgba(34, 211, 238, 0.2)",
    borderRadius: "20px",
  }}
>
  <button
    onClick={() => setSupervisorPage("restock")}
    style={{
      border: "none",
      background:
        supervisorPage === "restock" ? "#22d3ee" : "#1e293b",
      color:
        supervisorPage === "restock" ? "#020617" : "#e2e8f0",
      padding: "12px 20px",
      borderRadius: "14px",
      fontWeight: 800,
      cursor: "pointer",
      fontSize: "14px",
    }}
  >
    Restock Dashboard
  </button>

  <button
    onClick={() => setSupervisorPage("history")}
    style={{
      border: "none",
      background:
        supervisorPage === "history" ? "#22d3ee" : "#1e293b",
      color:
        supervisorPage === "history" ? "#020617" : "#e2e8f0",
      padding: "12px 20px",
      borderRadius: "14px",
      fontWeight: 800,
      cursor: "pointer",
      fontSize: "14px",
    }}
  >
    Usage History
  </button>

  <button
    onClick={() => setSupervisorPage("bulk")}
    style={{
      border: "none",
      background:
        supervisorPage === "bulk" ? "#22d3ee" : "#1e293b",
      color:
        supervisorPage === "bulk" ? "#020617" : "#e2e8f0",
      padding: "12px 20px",
      borderRadius: "14px",
      fontWeight: 800,
      cursor: "pointer",
      fontSize: "14px",
    }}
  >
    Freehold Inventory
  </button>
</div>
{supervisorPage === "bulk" && (
  <section className="historyCard">
    <h2>
      <PackageCheck size={24} /> Freehold Inventory
    </h2>

    <section className="statsGrid">
  <Stat
    icon={<PackageCheck />}
    label="Total Items"
    value={freeholdTotalItems}
  />

  <Stat
    icon={<ClipboardPlus />}
    label="Need Reorder"
    value={freeholdTotalReorderNeeded}
  />

  <Stat
    icon={<History />}
    label="Movement Logs"
    value={freeholdRecentMovements}
  />

  <Stat
    icon={<Building2 />}
    label="Location"
    value="Freehold"
  />
</section>

    <div
      style={{
        display: "flex",
        gap: "10px",
        marginBottom: "16px",
        flexWrap: "wrap",
      }}
    >
      {["count", "reorder", "movement", "items", "par"].map((page) => (
        <button
          key={page}
          onClick={() => setBulkPage(page)}
          style={{
            border: "none",
            background: bulkPage === page ? "#22d3ee" : "#e2e8f0",
            color: "#020617",
            padding: "10px 16px",
            borderRadius: "12px",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          {page === "count"
            ? "Count"
            : page === "reorder"
            ? "Reorder"
            : page === "movement"
            ? "Movement Log"
            : page === "items"
            ? "Items List"
            : "PAR"}
        </button>
      ))}
    </div>

      <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "20px",
    flexWrap: "wrap",
  }}
>
  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
    <label style={{ fontWeight: 900 }}>Search:</label>

    <input
      value={inventorySearch}
      onChange={(e) => setInventorySearch(e.target.value)}
      placeholder="Search item or category..."
      style={{ maxWidth: "320px" }}
    />
  </div>

  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
    <label style={{ fontWeight: 900 }}>Filter Category:</label>

    <select
      value={inventoryCategoryFilter}
      onChange={(e) => setInventoryCategoryFilter(e.target.value)}
    >
      {inventoryCategories.map((category) => (
        <option key={category} value={category}>
          {category}
        </option>
      ))}
    </select>
  </div>
</div>

    <div
  className="historyTableWrap"
  style={{ display: bulkPage === "items" ? "block" : "none" }}
>
      <table>
        <thead>
          <tr>
<th>Category</th>
<th>Item</th>
<th>Case</th>
<th>Units</th>
<th>Individual</th>
<th>Case Qty</th>
<th>Units Qty</th>
<th>Actions</th>
          </tr>
        </thead>
      <tbody>
  {inventoryItems.length === 0 ? (
    <tr>
      <td colSpan="8" className="noHistory">
        No inventory items found.
      </td>
    </tr>
  ) : (
    filteredInventoryItems.map((item) => (
      <tr key={item.id}>
        <td>{item.category}</td>
        <td>{item.item_name}</td>

        <td>
          <input
            value={editedItems[item.id]?.bulk_unit ?? item.bulk_unit ?? ""}
            onChange={(e) =>
              updateEditedItem(item.id, "bulk_unit", e.target.value)
            }
          />
        </td>

        <td>
          <input
            value={editedItems[item.id]?.inner_unit ?? item.inner_unit ?? ""}
            onChange={(e) =>
              updateEditedItem(item.id, "inner_unit", e.target.value)
            }
          />
        </td>

        <td>
          <input
            value={editedItems[item.id]?.base_unit ?? item.base_unit ?? ""}
            onChange={(e) =>
              updateEditedItem(item.id, "base_unit", e.target.value)
            }
          />
        </td>

        <td>
          <input
            type="number"
            min="0"
            value={
              editedItems[item.id]?.base_units_per_bulk ??
              item.base_units_per_bulk ??
              0
            }
            onChange={(e) =>
              updateEditedItem(item.id, "base_units_per_bulk", e.target.value)
            }
          />
        </td>

        <td>
          <input
            type="number"
            min="0"
            value={
              editedItems[item.id]?.base_units_per_inner ??
              item.base_units_per_inner ??
              0
            }
            onChange={(e) =>
              updateEditedItem(item.id, "base_units_per_inner", e.target.value)
            }
          />
        </td>

        <td>
          <button
            className="smallBtn"
            onClick={() => saveInventoryItem(item)}
          >
            Save
          </button>
        </td>
      </tr>
    ))
  )}
</tbody>
      </table>
    </div>

    {bulkPage === "count" && (  
   <div className="historyTableWrap">
    <div
  style={{
    display: "flex",
    justifyContent: "flex-end",
    gap: "13px",
    marginBottom: "9px",
    flexWrap: "wrap",
  }}
>
  <button className="btn" onClick={saveInventoryCount}>
    Save Count
  </button>

  <button className="btn secondary" onClick={startNewCount}>
    New Count
  </button>
</div>
  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th>Item</th>
        <th>Case</th>
        <th>Units</th>
        <th>Individual</th>
        <th>Total</th>
      </tr>
    </thead>

    <tbody>
      {filteredInventoryItems.map((item) => (
        <tr key={item.id}>
          <td>{item.category}</td>

          <td>{item.item_name}</td>

          <td>
            <input
              type="number"
              min="0"
              disabled={!Number(item.base_units_per_bulk)}
              value={inventoryCounts[item.id]?.cases || ""}

              onChange={(e) =>
                setInventoryCounts((prev) => ({
                  ...prev,
                  [item.id]: {
                    ...prev[item.id],
                    cases: e.target.value
                  }
                }))
              }
            />
          </td>

          <td>
            <input
              type="number"
              min="0"
              disabled={!Number(item.base_units_per_inner)}
              value={inventoryCounts[item.id]?.units || ""}
              onChange={(e) =>
                setInventoryCounts((prev) => ({
                  ...prev,
                  [item.id]: {
                    ...prev[item.id],
                    units: e.target.value
                  }
                }))
              }
            />
          </td>

          <td>
            <input
              type="number"
              min="0"
              disabled={!item.base_unit}
              value={inventoryCounts[item.id]?.individual || ""}
              onChange={(e) =>
                setInventoryCounts((prev) => ({
                  ...prev,
                  [item.id]: {
                    ...prev[item.id],
                    individual: e.target.value
                  }
                }))
              }
            />
          </td>
          <td className="qty">
  {calculateInventoryTotal(item)}
</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
    )}

{bulkPage === "reorder" && (
  <>
    <div style={{ marginBottom: "16px" }}>
      <button
        className="btn secondary"
        onClick={() => setShowReorderOnly((prev) => !prev)}
      >
        {showReorderOnly
          ? "Show All Items"
          : "Show Reorder Needed Only"}
      </button>
    </div>

    <div className="historyTableWrap">
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Item</th>
            <th>Current Total</th>
            <th>PAR Type</th>
            <th>PAR Amount</th>
            <th>Reorder Needed</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {reorderFilteredItems.map((item) => {
            const currentTotal = calculateInventoryTotal(item);
            const parAmount = Number(item.par_amount || 0);
            const reorderNeeded = Math.max(parAmount - currentTotal, 0);

            return (
              <tr key={item.id}>
                <td>{item.category}</td>
                <td>{item.item_name}</td>
                <td>{currentTotal}</td>
                <td>{item.par_type || "Case"}</td>
                <td>{parAmount}</td>
                <td>{reorderNeeded}</td>

                <td>
                  <button
                    className="smallBtn"
                    onClick={() => resetCurrentInventoryCount(item)}
                  >
                    Reset Count
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </>
)}

{bulkPage === "movement" && (
  <>
    <div className="historyTableWrap">
    <table>
      <thead>
        <tr>
          <th>Category</th>
          <th>Item</th>
          <th>Movement</th>
          <th>Type</th>
          <th>Amount</th>
          <th>Actions</th>
        </tr>
      </thead>

      <tbody>
        {filteredInventoryItems.map((item) => (
          <tr key={item.id}>
            <td>{item.category}</td>
            <td>{item.item_name}</td>

            <td>
              <select
                value={movementEntries[item.id]?.movement || "Added"}
                onChange={(e) =>
                  updateMovementEntry(item.id, "movement", e.target.value)
                }
              >
                <option value="Added">Added</option>
                <option value="Removed">Removed</option>
              </select>
            </td>

            <td>
              <select
                value={movementEntries[item.id]?.type || "Case"}
                onChange={(e) =>
                  updateMovementEntry(item.id, "type", e.target.value)
                }
              >
                <option value="Case">Case</option>
                <option value="Units">Units</option>
                <option value="Individual">Individual</option>
              </select>
            </td>

            <td>
              <input
  type="number"
  min="0"
  value={movementEntries[item.id]?.amount ?? ""}
  onChange={(e) =>
    updateMovementEntry(item.id, "amount", e.target.value)
  }
/>
            </td>

            <td>
             <button className="smallBtn" onClick={() => saveMovement(item)}>
  Save
</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
      </div>

    <div className="historyTableWrap" style={{ marginTop: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
  <h3>Movement History</h3>

  <button className="btn secondary" onClick={clearMovementHistory}>
    Clear History
  </button>
</div>

<table>
  <thead>
    <tr>
      <th>Date</th>
      <th>Category</th>
      <th>Item</th>
      <th>Movement</th>
<th>Type</th>
<th>Amount</th>
<th>Actions</th>    </tr>
  </thead>

  <tbody>
    {movementHistory.length === 0 ? (
      <tr>
<td colSpan="7" className="noHistory">          No movement history found.
        </td>
      </tr>
    ) : (
      movementHistory.map((log) => (
        <tr key={log.id}>
          <td>
            {new Date(log.movement_date).toLocaleString()}
          </td>

          <td>
            {log.inventory_items?.category || "Unknown"}
          </td>

          <td>
            {log.inventory_items?.item_name || "Unknown"}
          </td>

        <td>{log.movement_type}</td>

<td>{log.count_type || "N/A"}</td>

<td className="qty">
  {log.quantity_change}
</td>

<td>
  <button
    className="smallBtn"
    onClick={() => deleteMovementHistoryItem(log.id)}
  >
    Remove
  </button>
</td>
        </tr>
      ))
    )}
  </tbody>
</table>
    </div>
  </>
)}

{bulkPage === "par" && (
  <div className="historyTableWrap">
    <table>
      <thead>
        <tr>
          <th>Category</th>
          <th>Item</th>
          <th>PAR Type</th>
          <th>PAR Amount</th>
          <th>Actions</th>
        </tr>
      </thead>

      <tbody>
        {filteredInventoryItems.map((item) => (
          <tr key={item.id}>
            <td>{item.category}</td>
            <td>{item.item_name}</td>

            <td>
<select
  value={editedPar[item.id]?.par_type ?? item.par_type ?? "Case"}
  onChange={(e) => updateEditedPar(item.id, "par_type", e.target.value)}
>
  <option value="Case">Case</option>
  <option value="Units">Units</option>
  <option value="Individual">Individual</option>
</select>
            </td>

            <td>
<input
  type="number"
  min="0"
  value={editedPar[item.id]?.par_amount ?? item.par_amount ?? ""}
  onChange={(e) => updateEditedPar(item.id, "par_amount", e.target.value)}
/>
            </td>

            <td>
             <button
  className="smallBtn"
  onClick={() => saveParSetting(item)}
>
  Save
</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}
<div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "20px",
    flexWrap: "wrap",
  }}
>
  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
    <label style={{ fontWeight: 900 }}>Search:</label>

    <input
      value={inventorySearch}
      onChange={(e) => setInventorySearch(e.target.value)}
      placeholder="Search item or category..."
      style={{ maxWidth: "320px" }}
    />
  </div>

  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
    <label style={{ fontWeight: 900 }}>Filter Category:</label>

    <select
      value={inventoryCategoryFilter}
      onChange={(e) => setInventoryCategoryFilter(e.target.value)}
    >
      {inventoryCategories.map((category) => (
        <option key={category} value={category}>
          {category}
        </option>
      ))}
    </select>
  </div>
</div>

  </section>
  )}
          <section className="statsGrid" style={{ display: supervisorPage === "restock" ? "grid" : "none" }}>
            <Stat
              icon={<Building2 />}
              label="Stations Needing Supplies"
              value={new Set(pendingLogs.map((log) => log.station)).size}
            />
            <Stat
              icon={<ClipboardPlus />}
              label="Pending Submissions"
              value={pendingLogs.length}
            />
            <Stat icon={<PackageCheck />} label="Items Needed" value={totalNeeded} />
            <Stat icon={<History />} label="Most Used Item" value={mostUsedItem} />
          </section>
          <section className="stationGrid" style={{
display:
  supervisorPage === "restock"
    ? "grid"
    : "none"
}}>
            {stations.map((station) => {
              const stationPendingLogs = pendingLogs.filter(
                (log) => log.station === station
              );
              const stationTotal = stationPendingLogs.reduce(
                (sum, log) => sum + Number(log.qty),
                0
              );

              return (
                <div key={station} className="stationCard">
                  <div className="stationTop">
                    <div>
                      <h3>{station}</h3>
                      <p>
                        {stationPendingLogs.length
                          ? `${stationPendingLogs.length} crew log(s) • ${stationTotal} total item(s) needed`
                          : "No restock needed"}
                      </p>
                    </div>

                    {stationPendingLogs.length > 0 && (
                      <button
                        className="btn"
                        onClick={() => markStationRestocked(station)}
                      >
                        Mark Station Restocked
                      </button>
                    )}
                  </div>

                  {stationPendingLogs.length === 0 ? (
                    <div className="emptyState">
                      <CheckCircle2 size={20} /> No pending supplies for this
                      station.
                    </div>
                  ) : (
                    <div className="tableWrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Date</th>
                            <th>Employee #</th>
                            <th>Size / Comments</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stationPendingLogs.map((log) => (
                            <tr key={log.id}>
                              <td>{log.category}</td>
                              <td className="bold">{log.item}</td>
                              <td className="qty">{log.qty}</td>
                              <td>{log.date}</td>
                              <td>{log.employeeId}</td>
                              <td>{log.note || "None"}</td>
                              <td>
                                <button
                                  className="smallBtn"
                                  onClick={() => markItemRestocked([log.id])}
                                >
                                  Restocked
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          <section
  className="historyCard"
  style={{ display: supervisorPage === "history" ? "block" : "none" }}
>
            <h2>
              <History size={24} /> Usage History
            </h2>
            <div className="historyTableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Employee ID</th>
                    <th>Station</th>
                    <th>Category</th>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Status / Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="noHistory">
                        No usage history yet.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id}>
                        <td>{log.date}</td>
                        <td>{log.employeeId}</td>
                        <td>{log.station}</td>
                        <td>{log.category}</td>
                        <td>{log.item}</td>
                        <td>{log.qty}</td>
                        <td>
                          <div className="statusCell">
                            <span
                              className={
                                log.restocked
                                  ? "status restocked"
                                  : "status pending"
                              }
                            >
                              {log.restocked ? "Restocked" : "Pending"}
                            </span>

                            {log.restocked && (
                              <button
                                className="undoBtn"
                                onClick={() => undoRestocked(log.id)}
                              >
                                Undo
                              </button>
                            )}

                            <button
                              className="undoBtn"
                              onClick={() => archiveLog(log.id)}
                              >
                               Remove
                              </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      )}

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: Arial, Helvetica, sans-serif;
          background: #020617;
        }

        .app {
          min-height: 100vh;
          background: #020617;
          color: #f8fafc;
          padding: 24px;
        }

        .header {
          max-width: 1280px;
          margin: 0 auto 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .brandIcon {
          padding: 12px;
          border-radius: 18px;
          background: rgba(59, 130, 246, 0.2);
          border: 1px solid rgba(96, 165, 250, 0.4);
        }

        h1 {
          margin: 0;
          font-size: 32px;
          font-weight: 900;
        }

        .supervisorLogin {
          display: flex;
          gap: 8px;
          background: rgba(255, 255, 255, 0.08);
          padding: 8px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .supervisorLogin input {
          background: white;
          color: #020617;
          border: 0;
          border-radius: 12px;
          padding: 10px 12px;
          font-weight: 700;
          width: 160px;
        }

        .btn,
        .smallBtn {
          border: 0;
          border-radius: 14px;
          padding: 11px 16px;
          background: #0ea5e9;
          color: white;
          font-weight: 900;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn:hover,
        .smallBtn:hover {
          background: #38bdf8;
        }

        .secondary {
          background: #e2e8f0;
          color: #020617;
        }

        .secondary:hover {
          background: #f8fafc;
        }

        .message {
          max-width: 1280px;
          margin: 0 auto 20px;
          padding: 16px;
          border-radius: 18px;
          font-weight: 800;
        }

        .success {
          background: rgba(6, 78, 59, 0.9);
          color: #ecfdf5;
          border: 1px solid #34d399;
        }

        .warning {
          background: rgba(113, 63, 18, 0.9);
          color: #fef3c7;
          border: 1px solid #facc15;
        }

        .crewPage {
          max-width: 900px;
          margin: 0 auto;
        }

        .card,
        .formCard {
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 28px;
          padding: 30px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
        }

        .formCard h2 {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0 0 8px;
          font-size: 32px;
          color: white;
        }

        .subtext {
          color: #e2e8f0;
          font-weight: 700;
          margin-bottom: 28px;
        }

        .formGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .field label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 900;
          color: #f8fafc;
        }

        .field input,
        .field select,
        .field textarea {
          width: 100%;
          background: white;
          color: #020617;
          border: 2px solid #cbd5e1;
          border-radius: 14px;
          padding: 13px 14px;
          font-weight: 800;
          font-size: 15px;
          outline: none;
        }

        .field textarea {
          min-height: 100px;
          resize: vertical;
        }

        .field input:focus,
        .field select:focus,
        .field textarea:focus {
          border-color: #22d3ee;
          box-shadow: 0 0 0 4px rgba(34, 211, 238, 0.25);
        }

        .wide {
          grid-column: span 2;
        }

        .submitBtn {
          width: 100%;
          margin-top: 30px;
          border: 2px solid #a5f3fc;
          border-radius: 20px;
          padding: 22px;
          background: #22d3ee;
          color: #020617;
          font-size: 22px;
          font-weight: 1000;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          box-shadow: 0 0 28px rgba(34, 211, 238, 0.45);
        }

        .submitBtn:hover {
          background: #67e8f9;
        }

        .helpText {
          font-size: 13px;
          color: #cbd5e1;
          margin-top: 12px;
        }

        .supervisorPage {
          max-width: 1280px;
          margin: 0 auto;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 22px;
        }

        .statCard {
          background: white;
          color: #020617;
          border-radius: 20px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow: 0 16px 35px rgba(0, 0, 0, 0.25);
        }

        .statIcon {
          background: #020617;
          color: white;
          padding: 12px;
          border-radius: 16px;
          display: flex;
        }

        .statLabel {
          color: #334155;
          font-size: 13px;
          font-weight: 1000;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .statValue {
          font-size: 30px;
          font-weight: 1000;
          margin-top: 2px;
        }

        .sectionHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }

        .sectionHeader h2 {
          margin: 0;
          font-size: 28px;
        }

        .sectionHeader p {
          margin: 4px 0 0;
          color: #e2e8f0;
          font-weight: 700;
        }

        .stationGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .stationCard {
          background: #0f172a;
          border: 1px solid rgba(34, 211, 238, 0.3);
          border-radius: 26px;
          padding: 20px;
          box-shadow: 0 20px 45px rgba(0, 0, 0, 0.3);
        }

        .stationTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
        }

        .stationTop h3 {
          margin: 0;
          font-size: 30px;
          color: #67e8f9;
          font-weight: 1000;
        }

        .stationTop p {
          margin: 4px 0 0;
          color: #e2e8f0;
          font-weight: 700;
        }

        .emptyState {
          background: rgba(6, 78, 59, 0.9);
          color: #ecfdf5;
          border: 1px solid #34d399;
          border-radius: 18px;
          padding: 16px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .tableWrap,
        .historyTableWrap {
          overflow-x: auto;
          border-radius: 18px;
          border: 1px solid #334155;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 760px;
        }

        th {
          background: #083344;
          color: white;
          text-align: left;
          padding: 12px;
          font-size: 13px;
        }

        td {
          padding: 12px;
          border-bottom: 1px solid #334155;
          color: #f8fafc;
          font-weight: 700;
        }

        .bold {
          font-weight: 1000;
        }

        .qty {
          font-size: 20px;
          font-weight: 1000;
        }

        .historyCard {
          margin-top: 22px;
          background: white;
          color: #020617;
          border-radius: 26px;
          padding: 22px;
        }

        .historyCard h2 {
          margin: 0 0 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #020617;
        }

        .historyCard th {
          background: #020617;
          color: white;
        }

        .historyCard td {
          color: #020617;
          border-bottom: 1px solid #cbd5e1;
        }

        .historyCard tr:nth-child(even) td {
          background: #f1f5f9;
        }

        .statusCell {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .status {
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 1000;
        }

        .pending {
          background: #fef3c7;
          color: #713f12;
          border: 1px solid #facc15;
        }

        .restocked {
          background: #d1fae5;
          color: #064e3b;
          border: 1px solid #34d399;
        }

        .undoBtn {
          border: 1px solid #fca5a5;
          background: #fee2e2;
          color: #7f1d1d;
          border-radius: 10px;
          padding: 7px 10px;
          font-weight: 1000;
          cursor: pointer;
        }

        .noHistory {
          text-align: center;
          padding: 28px;
          font-weight: 900;
          color: #334155 !important;
        }

        @media (max-width: 900px) {
          .statsGrid,
          .stationGrid,
          .formGrid {
            grid-template-columns: 1fr;
          }

          .wide {
            grid-column: span 1;
          }

          .stationTop {
            flex-direction: column;
            align-items: flex-start;
          }

          .supervisorLogin {
            width: 100%;
          }

          .supervisorLogin input,
          .supervisorLogin button {
            flex: 1;
          }

          .app {
            padding: 16px;
          }

          h1 {
            font-size: 26px;
          }
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function Stat({ icon, label, value }) {
  return (
    <div className="statCard">
      <div className="statIcon">{React.cloneElement(icon, { size: 22 })}</div>
      <div>
        <div className="statLabel">{label}</div>
        <div className="statValue">{value}</div>
      </div>
    </div>
  );
}

