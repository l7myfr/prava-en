import { Head, Link, useForm } from '@inertiajs/react';
import { type FormEvent } from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/hooks/use-language';
import AuthLayout from '@/layouts/auth-layout';

/**
 * Fortify registration for the web build. Literal paths, not Wayfinder
 * imports: these routes only exist when APP_PLATFORM=web.
 */
export default function Register() {
    const { t } = useLanguage();

    const form = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post('/register', {
            onFinish: () => form.reset('password', 'password_confirmation'),
        });
    };

    return (
        <AuthLayout
            title={t('რეგისტრაცია')}
            description={t('შექმენი ანგარიში შედეგების შესანახად')}
        >
            <Head title={t('რეგისტრაცია')} />

            <form onSubmit={submit} className="flex flex-col gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="name">{t('სახელი')}</Label>
                    <Input
                        id="name"
                        name="name"
                        autoComplete="name"
                        autoFocus
                        value={form.data.name}
                        onChange={(e) => form.setData('name', e.target.value)}
                    />
                    <InputError message={form.errors.name} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="email">{t('ელფოსტა')}</Label>
                    <Input
                        id="email"
                        type="email"
                        name="email"
                        autoComplete="email"
                        value={form.data.email}
                        onChange={(e) => form.setData('email', e.target.value)}
                    />
                    <InputError message={form.errors.email} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="password">{t('პაროლი')}</Label>
                    <Input
                        id="password"
                        type="password"
                        name="password"
                        autoComplete="new-password"
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
                    {form.processing ? t('იტვირთება...') : t('რეგისტრაცია')}
                </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
                {t('უკვე გაქვს ანგარიში?')}{' '}
                <Link href="/login" className="underline underline-offset-4">
                    {t('შესვლა')}
                </Link>
            </p>
        </AuthLayout>
    );
}
