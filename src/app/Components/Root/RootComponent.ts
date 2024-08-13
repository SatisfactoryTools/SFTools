import {Component, ChangeDetectionStrategy} from '@angular/core';
import {RouterOutlet} from '@angular/router';

@Component({
    selector: 'root',
    templateUrl: './RootComponent.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [
        RouterOutlet
    ]
})
export class RootComponent
{

}
