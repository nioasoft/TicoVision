import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Textarea } from '@/components/ui/textarea';
import type { TurnoverApprovalVariables, TurnoverApprovalScenario } from '@/types/foreign-workers.types';

interface TurnoverApprovalTabProps {
  value: Partial<TurnoverApprovalVariables>;
  onChange: (data: Partial<TurnoverApprovalVariables>) => void;
  disabled?: boolean;
  /** Total turnover from AccountantTurnoverTab (Tab 0) - auto-fills scenarios A & B */
  accountantTotalTurnover?: number;
  /** Period dates from AccountantTurnoverTab (Tab 0) - auto-fills period_start & period_end */
  accountantPeriod?: { start?: string; end?: string };
}

export function TurnoverApprovalTab({ value, onChange, disabled, accountantTotalTurnover, accountantPeriod }: TurnoverApprovalTabProps) {
  // Calculate end period based on start period + months count
  // Format: MM/YYYY (Israeli standard)
  const calculateEndPeriod = (startPeriod: string, monthsCount: number): string => {
    if (!startPeriod || !monthsCount) return '';

    const [month, year] = startPeriod.split('/').map(Number); // MM/YYYY format
    if (!year || !month) return '';

    const startDate = new Date(year, month - 1); // month-1 because JS months are 0-indexed
    startDate.setMonth(startDate.getMonth() + monthsCount - 1); // -1 because we count inclusive

    const endYear = startDate.getFullYear();
    const endMonth = (startDate.getMonth() + 1).toString().padStart(2, '0');

    return `${endMonth}/${endYear}`; // Return MM/YYYY format
  };

  const handleScenarioChange = (scenario: TurnoverApprovalScenario) => {
    const baseUpdate: Partial<TurnoverApprovalVariables> = {
      ...value,
      scenario,
      // Clear other scenarios when switching
      scenario_12_plus: scenario === '12_plus' ? value.scenario_12_plus : undefined,
      scenario_4_to_11: scenario === '4_to_11' ? value.scenario_4_to_11 : undefined,
      scenario_up_to_3: scenario === 'up_to_3' ? value.scenario_up_to_3 : undefined
    };

    // Auto-fill from accountant data when selecting scenarios A or B
    if (scenario === '12_plus') {
      baseUpdate.scenario_12_plus = {
        period_start: accountantPeriod?.start || '',
        period_end: accountantPeriod?.end || '',
        total_turnover: accountantTotalTurnover || 0,
        total_costs: baseUpdate.scenario_12_plus?.total_costs || 0
      };
    } else if (scenario === '4_to_11') {
      baseUpdate.scenario_4_to_11 = {
        period_start: accountantPeriod?.start || '',
        period_end: accountantPeriod?.end || '',
        months_count: 12, // Default to 12, user can adjust for 4-11 scenarios
        total_turnover: accountantTotalTurnover || 0,
        total_costs: baseUpdate.scenario_4_to_11?.total_costs || 0,
        projected_annual_turnover: baseUpdate.scenario_4_to_11?.projected_annual_turnover || 0,
        projected_annual_costs: baseUpdate.scenario_4_to_11?.projected_annual_costs || 0
      };
    }

    onChange(baseUpdate);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">אישור מחזור/עלויות</CardTitle>
          <CardDescription className="text-right">
            נספח א' - אישור רו"ח על מחזור כספי מפעילות אסייתית / עלות הקמת עסק
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Scenario Selection */}
          <div className="space-y-3">
            <Label className="text-right block">
              בחר תרחיש 
            </Label>

            {/* Scenario A: 12+ months */}
            <label className="flex items-start gap-3 p-4 border rounded-md cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="scenario"
                value="12_plus"
                checked={value.scenario === '12_plus'}
                onChange={() => handleScenarioChange('12_plus')}
                disabled={disabled}
                className="mt-1"
              />
              <div className="flex-1 text-right">
                <div className="font-medium">א. פעילות של 12 חודשים ומעלה</div>
                <div className="text-sm text-gray-600">למסעדות בעלות פעילות כספית של 12 חודשים לפחות</div>
              </div>
            </label>

            {/* Scenario B: 4-11 months */}
            <label className="flex items-start gap-3 p-4 border rounded-md cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="scenario"
                value="4_to_11"
                checked={value.scenario === '4_to_11'}
                onChange={() => handleScenarioChange('4_to_11')}
                disabled={disabled}
                className="mt-1"
              />
              <div className="flex-1 text-right">
                <div className="font-medium">ב. פעילות של 4-11 חודשים</div>
                <div className="text-sm text-gray-600">למסעדות בעלות פעילות כספית של 4 עד 11 חודשים (כולל)</div>
              </div>
            </label>

            {/* Scenario C: Up to 3 months */}
            <label className="flex items-start gap-3 p-4 border rounded-md cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="scenario"
                value="up_to_3"
                checked={value.scenario === 'up_to_3'}
                onChange={() => handleScenarioChange('up_to_3')}
                disabled={disabled}
                className="mt-1"
              />
              <div className="flex-1 text-right">
                <div className="font-medium">ג. פעילות של עד 3 חודשים</div>
                <div className="text-sm text-gray-600">למסעדות בעלות פעילות כספית של עד 3 חודשים (כולל)</div>
              </div>
            </label>
          </div>

          {/* Scenario A Fields */}
          {value.scenario === '12_plus' && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-lg text-right">תרחיש א: 12 חודשים ומעלה</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="period-start-12" className="text-right block">
                      חודש התחלה 
                    </Label>
                    <Input
                      id="period-start-12"
                      value={value.scenario_12_plus?.period_start || ''}
                      onChange={(e) =>
                        onChange({
                          ...value,
                          scenario_12_plus: {
                            ...value.scenario_12_plus,
                            period_start: e.target.value,
                            period_end: value.scenario_12_plus?.period_end || '',
                            total_turnover: value.scenario_12_plus?.total_turnover || 0,
                            total_costs: value.scenario_12_plus?.total_costs || 0
                          }
                        })
                      }
                      pattern="\d{2}/\d{4}"
                      title="פורמט: MM/YYYY (לדוגמה: 01/2024)"
                      disabled={disabled}
                      className="text-right rtl:text-right"
                      dir="rtl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="period-end-12" className="text-right block">
                      חודש סיום 
                    </Label>
                    <Input
                      id="period-end-12"
                      value={value.scenario_12_plus?.period_end || ''}
                      onChange={(e) =>
                        onChange({
                          ...value,
                          scenario_12_plus: {
                            ...value.scenario_12_plus!,
                            period_end: e.target.value
                          }
                        })
                      }
                      pattern="\d{2}/\d{4}"
                      title="פורמט: MM/YYYY (לדוגמה: 12/2024)"
                      disabled={disabled}
                      className="text-right rtl:text-right"
                      dir="rtl"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total-turnover-12" className="text-right block">
                    סך מחזור (ש"ח) 
                  </Label>
                  <MoneyInput
                    value={value.scenario_12_plus?.total_turnover === 0 ? '' : (value.scenario_12_plus?.total_turnover || '')}
                    onChange={(newValue) =>
                      onChange({
                        ...value,
                        scenario_12_plus: {
                          ...value.scenario_12_plus!,
                          total_turnover: typeof newValue === 'number' ? newValue : 0
                        }
                      })
                    }
                    disabled={disabled}
                    className="text-right rtl:text-right"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Scenario B Fields */}
          {value.scenario === '4_to_11' && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-lg text-right">תרחיש ב: 4-11 חודשים</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="period-start-4" className="text-right block">
                      חודש התחלה 
                    </Label>
                    <Input
                      id="period-start-4"
                      value={value.scenario_4_to_11?.period_start || ''}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        const monthsCount = value.scenario_4_to_11?.months_count || 0;

                        onChange({
                          ...value,
                          scenario_4_to_11: {
                            ...value.scenario_4_to_11,
                            period_start: newStart,
                            period_end: calculateEndPeriod(newStart, monthsCount), // AUTO-CALCULATED
                            months_count: monthsCount,
                            total_turnover: value.scenario_4_to_11?.total_turnover || 0,
                            total_costs: value.scenario_4_to_11?.total_costs || 0,
                            projected_annual_turnover: value.scenario_4_to_11?.projected_annual_turnover || 0,
                            projected_annual_costs: value.scenario_4_to_11?.projected_annual_costs || 0
                          }
                        });
                      }}
                      pattern="\d{2}/\d{4}"
                      title="פורמט: MM/YYYY (לדוגמה: 01/2024)"
                      disabled={disabled}
                      className="text-right rtl:text-right"
                      dir="rtl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="period-end-4" className="text-right block">
                      חודש סיום (מחושב אוטומטית)
                    </Label>
                    <Input
                      id="period-end-4"
                      value={value.scenario_4_to_11?.period_end || ''}
                      disabled={true}
                      className="text-right rtl:text-right bg-gray-100"
                      dir="rtl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="months-count" className="text-right block">
                      מספר חודשים 
                    </Label>
                    <Input
                      id="months-count"
                      type="number"
                      min="4"
                      max="11"
                      value={value.scenario_4_to_11?.months_count === 0 ? '' : (value.scenario_4_to_11?.months_count || '')}
                      onChange={(e) => {
                        const newMonthsCount = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                        const periodStart = value.scenario_4_to_11?.period_start || '';

                        onChange({
                          ...value,
                          scenario_4_to_11: {
                            ...value.scenario_4_to_11!,
                            months_count: newMonthsCount,
                            period_end: calculateEndPeriod(periodStart, newMonthsCount) // AUTO-CALCULATED
                          }
                        });
                      }}
                      disabled={disabled}
                      className="text-right rtl:text-right"
                      dir="rtl"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total-turnover-4" className="text-right block">
                    סך מחזור (ש"ח) 
                  </Label>
                  <MoneyInput
                    value={value.scenario_4_to_11?.total_turnover === 0 ? '' : (value.scenario_4_to_11?.total_turnover || '')}
                    onChange={(newValue) =>
                      onChange({
                        ...value,
                        scenario_4_to_11: {
                          ...value.scenario_4_to_11!,
                          total_turnover: typeof newValue === 'number' ? newValue : 0
                        }
                      })
                    }
                    disabled={disabled}
                    className="text-right rtl:text-right"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Scenario C Fields */}
          {value.scenario === 'up_to_3' && (
            <Card className="border-purple-200 bg-purple-50">
              <CardHeader>
                <CardTitle className="text-lg text-right">תרחיש ג: עד 3 חודשים</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="estimated-costs" className="text-right block">
                    עלות הקמת העסק (ש"ח) 
                  </Label>
                  <MoneyInput
                    value={value.scenario_up_to_3?.estimated_annual_costs === 0 ? '' : (value.scenario_up_to_3?.estimated_annual_costs || '')}
                    onChange={(newValue) =>
                      onChange({
                        ...value,
                        scenario_up_to_3: {
                          ...value.scenario_up_to_3,
                          estimated_annual_turnover: value.scenario_up_to_3?.estimated_annual_turnover || 0,
                          estimated_annual_costs: typeof newValue === 'number' ? newValue : 0,
                          estimate_basis: value.scenario_up_to_3?.estimate_basis || ''
                        }
                      })
                    }
                    disabled={disabled}
                    className="text-right rtl:text-right"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimate-basis" className="text-right block">
                    בסיס להערכה 
                  </Label>
                  <Textarea
                    id="estimate-basis"
                    value={value.scenario_up_to_3?.estimate_basis || ''}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        scenario_up_to_3: {
                          ...value.scenario_up_to_3!,
                          estimate_basis: e.target.value
                        }
                      })
                    }
                    disabled={disabled}
                    className="text-right rtl:text-right"
                    dir="rtl"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Validation */}
          {!value.scenario && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 text-right">
                יש לבחור תרחיש ולמלא את כל השדות הנדרשים
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
