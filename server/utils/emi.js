function roundToCents(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function calculateMonthlyEmi(principal, annualRatePercent, months) {
  const P = Number(principal);
  const N = Number(months);
  const R = Number(annualRatePercent) / 12 / 100;

  if (!Number.isFinite(P) || P <= 0) throw Object.assign(new Error('Invalid principal'), { status: 400 });
  if (!Number.isFinite(N) || N <= 0) throw Object.assign(new Error('Invalid tenure months'), { status: 400 });
  if (!Number.isFinite(R) || R < 0) throw Object.assign(new Error('Invalid annual interest rate'), { status: 400 });

  if (R === 0) return roundToCents(P / N);

  const pow = Math.pow(1 + R, N);
  return roundToCents((P * R * pow) / (pow - 1));
}

function generateEmiSchedule({ principal, annualRatePercent, months }) {
  const P = Number(principal);
  const N = Number(months);
  const annual = Number(annualRatePercent);
  const R = annual / 12 / 100;

  const monthlyEMI = calculateMonthlyEmi(P, annual, N);

  let balance = roundToCents(P);
  let totalInterest = 0;
  const schedule = [];

  for (let month = 1; month <= N; month += 1) {
    const interest = roundToCents(balance * R);
    let principalPaid = roundToCents(monthlyEMI - interest);

    if (month === N) {
      principalPaid = roundToCents(balance);
    }

    const newBalance = roundToCents(balance - principalPaid);
    schedule.push({
      month,
      principal: principalPaid,
      interest,
      balance: newBalance,
    });
    balance = newBalance;
    totalInterest = roundToCents(totalInterest + interest);
  }

  return { monthlyEMI, totalInterest, schedule };
}

module.exports = { generateEmiSchedule, calculateMonthlyEmi };

