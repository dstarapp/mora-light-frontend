import ConstantInput from './light/components/constant';
import MoraLight from './light';
import MoraLights from './lights';
import WrappedMoraLight from './wrapped';

export {
    onPlugConnectionUpdate,
    setDerivationOrigin,
    getDerivationOrigin,
} from './modules/login/login';

import 'virtual:windi.css';

const components = [ConstantInput, MoraLight, MoraLights, WrappedMoraLight];

const install = function (app: any) {
    components.forEach((component) => {
        app.component(component.name, component);
    });
};
if (typeof window !== 'undefined' && (window as any).Vue) {
    install((window as any).Vue);
}

export { install, ConstantInput, MoraLight, MoraLights, WrappedMoraLight };

export default { install };
