import { Head, useForm } from '@inertiajs/react';
import { type FormEvent } from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/hooks/use-language';
import AuthLayout from '@/layouts/auth-layout';

/** Web build only: literal paths, see auth/welcome.tsx. */
export default function ResetPassword({
    token,
    email,
}: {
    token: string;
    email: string;
}) {
    const { t } = useLanguage();

    const form = useForm({
        token,
        email,
        password: '',
        password_confirmation: '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post('/reset-password', {
            onFinish: () => form.reset('password', 'password_confirmation'),
        });
    };

    return (
        <AuthLayout
            title={t('ახალი პაროლი')}
            description={t('შეიყვანე ახალი პაროლი')}
        >
            <Head title={t('ახალი პაროლი')} />

            <form onSubmit={submit} className="flex flex-col gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="email">{t('ელფოსტა')}</Label>
                    <Input
                        id="email"
                        type="email"
                        name="email"
                        readOnly
                        value={form.data.email}
                    />
                    <InputError message={form.errors.email} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="password">{t('ახალი პაროლი')}</Label>
                    <Input
                        id="password"
                        type="password"
                        name="password"
                        autoComplete="new-password"
                        autoFocus
                        value={form.data.password}
                        onChange={(e) =>
                            form.setData('password', e.target.value)
                        }
                    />
                    <InputError message={form.errors.password} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="password_confirmation">
                        {t('გაიმეორე პაროლი')}
                    </Label>
                    <Input
                        id="password_confirmation"
                        type="password"
                        name="password_confirmation"
                        autoComplete="new-password"
                        value={form.data.password_confirmation}
                        onChange={(e) =>
                            form.setData(
                                'password_confirmation',
                                e.target.value,
                            )
                        }
                    />
                    <InputError message={form.errors.password_confirmation} />
                </div>

                <Button
                    type="submit"
                    className="w-full"
                    disabled={form.processing}
                >
                    {form.processing ? t('ინახება...') : t('პაროლის შეცვლა')}
                </Button>
            </form>
        </AuthLayout>
    );
}
