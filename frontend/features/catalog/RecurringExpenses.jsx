'use client';

import { useId, useState } from 'react';

import { useRecurringExpenses } from './useCatalog';
import { useExpenseCategories } from '@/features/admin/useAdmin';
import { useAuth } from '@/features/auth/AuthProvider';
import { useI18n } from '@/features/i18n/I18nProvider';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { DateInput, Field, Input, NumberInput, Select } from '@/components/ui/Field';
import { Card } from '@/components/layout/PageHeader';
import { formatDate, formatMoney, formatNumber, toIsoDate } from '@/lib/format';

/**
 * Expenses that come back every month (ADR-041).
 *
 * Above the expense list, because it answers the question the list raises:
 * "why is the rent there again?" Each rule writes an ordinary expense on its
 * day; stopping one keeps the months it already wrote.
 */
export function RecurringExpenses() {
  const { t } = useI18n();
  const { can } = useAuth();
  const { rules, isLoading, remove } = useRecurringExpenses();
  const [adding, setAdding] = useState(false);
  const [stopping, setStopping] = useState(null);

  if (!can('expenses.view')) return null;

  return (
    <Card
      title={t('expenses.recurring.title')}
      description={t('expenses.recurring.description')}
      icon="repeat"
      className="mb-4"
      actions={
        can('expenses.create') ? (
          <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
            {t('expenses.recurring.add')}
          </Button>
        ) : null
      }
    >
      {isLoading ? null : rules.length === 0 ? (
        <p className="text-sm text-(--color-text-2)">{t('expenses.recurring.empty')}</p>
      ) : (
        <ul className="divide-y divide-(--color-line)">
          {rules.map((rule) => (
            <li key={rule.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-(--color-text)">{rule.description}</p>
                <p className="text-sm text-(--color-text-2)">
                  {[
                    rule.category?.name,
                    t('expenses.recurring.every', { day: formatNumber(rule.day_of_month) }),
                    rule.ends_on
                      ? t('expenses.recurring.until', { date: formatDate(rule.ends_on) })
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <span className="tabular font-semibold text-(--color-text)">
                {formatMoney(rule.amount)}
              </span>

              {can('expenses.delete') &&
                (stopping === rule.id ? (
                  <div
                    role="alertdialog"
                    aria-label={t('expenses.recurring.stop')}
                    className="flex w-full flex-wrap items-center gap-2 rounded-(--radius-control) bg-(--color-danger-soft) px-3 py-2"
                  >
                    <p className="flex-1 text-sm text-(--color-danger)">
                      {t('expenses.recurring.stopConfirm', { description: rule.description })}
                    </p>
                    <Button
                      variant="danger"
                      size="sm"
                      loading={remove.isPending}
                      onClick={() => remove.mutate(rule.id, { onSettled: () => setStopping(null) })}
                    >
                      {t('expenses.recurring.stopAction')}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setStopping(null)}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setStopping(rule.id)}>
                    {t('expenses.recurring.stop')}
                  </Button>
                ))}
            </li>
          ))}
        </ul>
      )}

      {adding ? <RecurringExpenseDialog onClose={() => setAdding(false)} /> : null}
    </Card>
  );
}

function RecurringExpenseDialog({ onClose }) {
  const { t } = useI18n();
  const { create } = useRecurringExpenses();
  const { categories } = useExpenseCategories();
  const formId = useId();
  const [fieldErrors, setFieldErrors] = useState({});
  const [failure, setFailure] = useState(null);
  const [values, setValues] = useState({
    expense_category_id: '',
    description: '',
    amount: '',
    vendor: '',
    day_of_month: '1',
    starts_on: toIsoDate(new Date()),
    ends_on: '',
  });

  function set(key, value) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setFailure(null);
    setFieldErrors({});

    try {
      await create.mutateAsync({
        expense_category_id: Number(values.expense_category_id) || null,
        description: values.description.trim(),
        amount: values.amount,
        vendor: values.vendor.trim() || null,
        day_of_month: Number(values.day_of_month),
        starts_on: values.starts_on,
        ends_on: values.ends_on || null,
      });
      onClose();
    } catch (error) {
      if (error.isValidation) {
        setFieldErrors(error.fieldErrors);

        return;
      }

      setFailure(error.message);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('expenses.recurring.newTitle')}
      description={t('expenses.recurring.formDescription')}
      placement="side"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={create.isPending}>
            {t('expenses.recurring.save')}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="space-y-4">
        {failure ? (
          <p
            role="alert"
            className="rounded-(--radius-control) bg-(--color-danger-soft) px-4 py-3 text-sm text-(--color-danger)"
          >
            {failure}
          </p>
        ) : null}

        <Field label={t('expenses.columns.description')} error={fieldErrors.description} required>
          {(props) => (
            <Input
              value={values.description}
              onChange={(event) => set('description', event.target.value)}
              maxLength={255}
              {...props}
            />
          )}
        </Field>

        <Field
          label={t('products.columns.category')}
          error={fieldErrors.expense_category_id}
          required
        >
          {(props) => (
            <Select
              value={values.expense_category_id}
              onChange={(event) => set('expense_category_id', event.target.value)}
              placeholder={t('expenses.anyCategory')}
              options={categories.map((category) => ({
                value: String(category.id),
                label: category.name,
              }))}
              {...props}
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('expenses.columns.amount')} error={fieldErrors.amount} required>
            {(props) => (
              <NumberInput
                value={values.amount}
                onChange={(event) => set('amount', event.target.value)}
                min={0}
                step="0.001"
                {...props}
              />
            )}
          </Field>

          <Field
            label={t('expenses.recurring.day')}
            hint={t('expenses.recurring.dayHint')}
            error={fieldErrors.day_of_month}
            required
          >
            {(props) => (
              <NumberInput
                value={values.day_of_month}
                onChange={(event) => set('day_of_month', event.target.value)}
                min={1}
                max={31}
                step="1"
                {...props}
              />
            )}
          </Field>

          <Field label={t('expenses.recurring.startsOn')} error={fieldErrors.starts_on} required>
            {(props) => (
              <DateInput
                value={values.starts_on}
                onChange={(event) => set('starts_on', event.target.value)}
                {...props}
              />
            )}
          </Field>

          <Field label={t('expenses.recurring.endsOn')} error={fieldErrors.ends_on}>
            {(props) => (
              <DateInput
                value={values.ends_on}
                onChange={(event) => set('ends_on', event.target.value)}
                {...props}
              />
            )}
          </Field>
        </div>

        <Field label={t('expenses.columns.vendor')} error={fieldErrors.vendor}>
          {(props) => (
            <Input
              value={values.vendor}
              onChange={(event) => set('vendor', event.target.value)}
              maxLength={180}
              {...props}
            />
          )}
        </Field>
      </form>
    </Dialog>
  );
}
