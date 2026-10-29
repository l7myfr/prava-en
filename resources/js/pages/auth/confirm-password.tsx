import { Head, useForm } from '@inertiajs/react';
import { type FormEvent } from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/hooks/use-language';
import AuthLayout from '@/layouts/auth-layout';

/** Web build only: literal paths, see auth/welcome.tsx. */
export default function ConfirmPassword() {
    const { t } = useLanguage();

    const form = useForm({ password: '' });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post('/user/confirm-password', {
            onFinish: () => form.reset('password'),
        });
    };

    return (
        <AuthLayout
            title={t('პაროლის დადასტურება')}
            description={t('უსაფრთხოებისთვის გთხოვთ დაადასტუროთ პაროლი')}
        >
            <Head title={t('პაროლის დადასტურება')} />

            <form onSubmit={submit} className="flex flex-col gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="password">{t('პაროლი')}</Label>
                    <Input
                        id="password"
                        type="password"
                        name="password"
                        autoComplete="current-password"
                        autoFocus
                        value={form.data.password}
                        onChange={(e) =>
                            form.setData('password', e.target.value)
                        }
                    />
                    <InputError message={form.errors.password} />
                </div>

                <Button
                    type="submit"
                    className="w-full"
                    disabled={form.processing}
                >
                    {form.processing ? t('იტვირთება...') : t('დადასტურება')}
                </Button>
            </form>
        </AuthLayout>
    );
}
