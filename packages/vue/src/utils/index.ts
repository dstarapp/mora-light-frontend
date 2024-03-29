import CONFIG from '../assets/config';
import useClipboard from 'vue-clipboard3';
import { ElMessage } from 'element-plus';
import FileSaver from 'file-saver';
import XLSX from 'xlsx';

export const getImagesUrl = (
    link: string,
    width: undefined | number = undefined,
    height: undefined | number = undefined,
) => {
    let url = link.includes('https://') ? link : `${CONFIG.imgBaseUrl}${link}`;
    if (width || height) {
        url += `?`;
        if (width) {
            url += `width=${width}`;
        }
        if (height) {
            url += `${width ? '&' : ''}height=${height}`;
        }
    }
    return url;
};

export const dealPid = (pid: string) => {
    if (!pid) {
        return '';
    }
    let arr = pid.split('-');
    return arr[0] + '...' + arr[arr.length - 1];
};

export const copyText = async (text: string = '') => {
    const { toClipboard } = useClipboard();
    try {
        await toClipboard(text);
        ElMessage.success('Copy success');
    } catch (e) {
        ElMessage.error('Copy error');
    }
};

export const exportTableAsXLSX = function (_targetId: string, fileName: string) {
    
    let wb = XLSX.utils.table_to_book(document.getElementById(_targetId));
    
    let wbout = XLSX.write(wb, {
        bookType: 'xlsx',
        bookSST: true,
        type: 'array',
    });
    
    try {
        FileSaver.saveAs(
            
            new Blob([wbout], { type: 'application/octet-stream' }),
            
            `${fileName}.xlsx`,
        );
    } catch (e) {
        if (typeof console != 'undefined') console.log(e, wbout);
    }
};
