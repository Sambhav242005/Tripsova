"use client";

import React, { useState } from "react";
import type { Theme } from "@/data";
import { Card, Btn, SectionTitle, InputF } from "../primitives/index";
import { api } from "@/lib/api";

export function BudgetScreen({ t }: { t: Theme }) {
  const [expenses, setExpenses] = useState([
    { id: 1, desc: "Hotel check-in", amount: 2400, category: "Stay", paidBy: "You", split: ["You", "Rahul", "Priya"] },
    { id: 2, desc: "Lunch at Sharma Dhaba", amount: 540, category: "Food", paidBy: "Rahul", split: ["You", "Rahul", "Priya"] },
    { id: 3, desc: "Taxi to viewpoint", amount: 600, category: "Transport", paidBy: "Priya", split: ["You", "Rahul", "Priya"] },
  ]);
  const [adding, setAdding] = useState(false);
  const [newExp, setNewExp] = useState({ desc: "", amount: "", category: "Food", paidBy: "You" });
  const [saved, setSaved] = useState(false);
  const categories = ["Food", "Stay", "Transport", "Activities", "Shopping", "Other"];
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const perPerson = Math.round(total / 3);
  const addExpense = () => {
    if (!newExp.desc || !newExp.amount) return;
    setExpenses(e => [...e, { id: Date.now(), desc: newExp.desc, amount: parseInt(newExp.amount), category: newExp.category, paidBy: newExp.paidBy, split: ["You", "Rahul", "Priya"] }]);
    setNewExp({ desc: "", amount: "", category: "Food", paidBy: "You" });
    setAdding(false);
    setSaved(false);
  };
  const saveBudget = async () => {
    try {
      await api.post("/api/budget/save", { expenses });
    } catch {
      localStorage.setItem("tripova-budget", JSON.stringify(expenses));
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ padding: "0 16px 110px" }}>
      <div style={{ background: `linear-gradient(135deg,${t.accent}12,${t.secondary}08)`, borderRadius: 12, padding: "13px 16px", marginBottom: 20, border: `1px solid ${t.accent}15` }}>
        <div style={{ fontSize: 14, color: t.accent, fontWeight: 700 }}>💰 Budget Tracker</div>
        <div style={{ fontSize: 12, color: t.muted, fontStyle: "italic", marginTop: 2 }}>Split expenses. Zero awkwardness.</div>
      </div>

      <Card t={t} style={{ background: `linear-gradient(135deg,${t.accent}10,${t.secondary}08)`, border: `1px solid ${t.accent}20` }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
          {[{ label: "Total Spent", val: `₹${total.toLocaleString()}`, color: t.text }, { label: "Per Person", val: `₹${perPerson.toLocaleString()}`, color: t.accent }, { label: "Expenses", val: expenses.length, color: t.secondary }].map(s => (
            <div key={s.label}><div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</div><div style={{ fontSize: 10, color: t.muted, textTransform: "uppercase", letterSpacing: 1.5 }}>{s.label}</div></div>
          ))}
        </div>
      </Card>

      <SectionTitle t={t}>Expenses</SectionTitle>
      {expenses.map(e => (
        <div key={e.id} style={{ background: t.card, borderRadius: 12, padding: "12px 14px", marginBottom: 10, border: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{e.desc}</div>
            <div style={{ fontSize: 11, color: t.muted, marginTop: 2 }}>{e.category} · Paid by {e.paidBy} · Split {e.split.length} ways</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.accent }}>₹{e.amount}</div>
            <div style={{ fontSize: 11, color: t.muted }}>₹{Math.round(e.amount / e.split.length)}/person</div>
          </div>
        </div>
      ))}

      {adding ? (
        <Card t={t}>
          <InputF label="Description" value={newExp.desc} onChange={e => setNewExp(n => ({ ...n, desc: e.target.value }))} placeholder="What was this for?" t={t} />
          <InputF label="Amount (₹)" value={newExp.amount} onChange={e => setNewExp(n => ({ ...n, amount: e.target.value }))} type="number" placeholder="0" t={t} />
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: t.muted, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 7 }}>Category</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {categories.map(c => <button key={c} onClick={() => setNewExp(n => ({ ...n, category: c }))} style={{ padding: "5px 12px", borderRadius: 5, border: `1.5px solid ${newExp.category === c ? t.accent : t.border}`, background: newExp.category === c ? t.accent + "12" : t.tag, color: newExp.category === c ? t.accent : t.muted, fontSize: 12, fontWeight: newExp.category === c ? 700 : 400, cursor: "pointer" }}>{c}</button>)}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={addExpense} t={t} full>Add Expense</Btn>
            <Btn onClick={() => setAdding(false)} outline t={t}>Cancel</Btn>
          </div>
        </Card>
      ) : (
        <button onClick={() => setAdding(true)} style={{ width: "100%", padding: "12px", borderRadius: 10, border: `1.5px dashed ${t.border}`, background: "transparent", color: t.muted, fontSize: 13, cursor: "pointer", marginBottom: 16 }}>+ Add Expense</button>
      )}

      <SectionTitle t={t}>Settle Up</SectionTitle>
      <Card t={t}>
        {[{ from: "Rahul", to: "You", amount: 150 }, { from: "Priya", to: "Rahul", amount: 80 }].map((s, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${t.border}` }}>
            <span style={{ fontSize: 13, color: t.text }}><strong>{s.from}</strong> owes <strong>{s.to}</strong></span>
            <span style={{ fontSize: 14, fontWeight: 700, color: t.success }}>₹{s.amount}</span>
          </div>
        ))}
        <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
          <Btn full outline color={t.success} t={t}>Export Summary PDF</Btn>
          <Btn full onClick={saveBudget} t={t}>{saved ? "✓ Saved" : "Save Budget"}</Btn>
        </div>
      </Card>
    </div>
  );
}
