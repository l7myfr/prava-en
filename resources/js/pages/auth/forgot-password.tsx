import { Head, Link, useForm } from '@inertiajs/react';
import { type FormEvent } from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/hooks/use-language';
import AuthLayout from '@/layouts/auth-layout';

/** Web build only: literal paths, see auth/welcome.tsx. */
export default function ForgotPassword({ status }: { status?: string }) {
    const { t } = useLanguage();

    const form = useForm({ email: '' });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post('/forgot-password');
    };

    return (
        <AuthLayout
            title={t('პაროლის აღდგენა')}
            description={t('გამოგიგზავნით ბმულს პაროლის შესაცვლელად')}
        >
            <Head title={t('პაროლის აღდგენა')} />

            {status && (
                <div className="text-center text-sm font-medium text-green-600">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="flex flex-col gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="email">{t('ელფოსტა')}</Label>
                    <Input
                        id="email"
                        type="email"
                        name="email"
                        autoComplete="email"
                        autoFocus
                        value={form.data.email}
                        onChange={(e) => form.setData('email', e.target.value)}
                    />
                    <InputError message={form.errors.email} />
                </div>

                <Button
                    type="submit"
                    className="w-full"
                    disabled={form.processing}
                >
                    {form.processing
                        ? t('იგზავნება...')
                        : t('ბმულის გამოგზავნა')}
                </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
                <Link href="/login" className="underline underline-offset-4">
                    {t('დაბრუნება შესვლაზე')}
                </Link>
            </p>
        </AuthLayout>
    );
}
